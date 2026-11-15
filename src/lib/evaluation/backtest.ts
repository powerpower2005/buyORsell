import { RSI, SMA } from "technicalindicators";
import {
  simulateTrade,
  executionOptions,
  type ExecutionOptions,
} from "./execution";
import { EXECUTION_VERSION } from "../versions";
import type { BacktestResult, BacktestTrade, OHLCVBar } from "../types";
import type { IndicatorResults } from "../types";

export interface StrategyRules {
  entry: string;
  exit: string;
  rsiPeriod?: number;
  horizon?: number;
  feeBps?: number;
  slippageBps?: number;
  stop_loss_pct?: number;
  take_profit_pct?: number;
}

function evalSimpleCondition(
  expr: string,
  rsiValue: number | null,
  close: number,
  sma50: number | null,
  sma200: number | null,
): boolean {
  // Supported grammar is OR of AND groups; reject unknown text instead of silently ignoring it.
  const groups = expr
    .toUpperCase()
    .split(/\s+OR\s+/)
    .map((group) =>
      group.split(/\s+AND\s+/).map((term) => {
        const match =
          /^(RSI|CLOSE)\s*(<|>)\s*(SMA\s*50|SMA\s*200|\d+(?:\.\d+)?)$/.exec(
            term.trim(),
          );
        if (!match) throw new Error(`지원하지 않는 조건식: ${term}`);
        const lhs = match[1] === "RSI" ? rsiValue : close;
        const rhs =
          match[3].replace(/\s/g, "") === "SMA50"
            ? sma50
            : match[3].replace(/\s/g, "") === "SMA200"
              ? sma200
              : Number(match[3]);
        return (
          lhs != null &&
          rhs != null &&
          (match[2] === "<" ? lhs < rhs : lhs > rhs)
        );
      }),
    );
  return groups.some((group) => group.every(Boolean));
}

/** Shared metrics from a closed trade list. */
export function summarizeBacktestTrades(
  trades: BacktestTrade[],
  pendingReturns: number[] = [],
): BacktestResult {
  let equity = 100;
  let peak = 100;
  let maxDd = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winSum = 0;
  let lossSum = 0;
  let longCount = 0;
  let shortCount = 0;

  for (const t of trades) {
    if (t.returnPct > 1e-10) {
      wins++;
      grossProfit += (equity * t.returnPct) / 100;
      winSum += t.returnPct;
    } else if (t.returnPct < -1e-10) {
      losses++;
      grossLoss += (equity * Math.abs(t.returnPct)) / 100;
      lossSum += t.returnPct;
    }
    if (Math.abs(t.returnPct) < 1e-10) breakeven++;
    if (t.side === "long") longCount++;
    else if (t.side === "short") shortCount++;

    for (const ret of t.equityReturns ?? [t.returnPct]) {
      const marked = equity * (1 + ret / 100);
      peak = Math.max(peak, marked);
      maxDd = Math.max(maxDd, ((peak - marked) / peak) * 100);
    }
    equity *= 1 + t.returnPct / 100;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
  }

  for (const ret of pendingReturns) {
    const marked = equity * (1 + ret / 100);
    peak = Math.max(peak, marked);
    maxDd = Math.max(maxDd, ((peak - marked) / peak) * 100);
  }
  const n = trades.length;
  const lossCount = losses;
  const avgReturn = n ? trades.reduce((s, t) => s + t.returnPct, 0) / n : 0;
  const avgWin = wins ? winSum / wins : 0;
  const avgLoss = lossCount ? lossSum / lossCount : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    breakevenCount: breakeven,
    totalReturnPct: Math.round((equity - 100) * 100) / 100,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    winRate: n ? Math.round((wins / n) * 1000) / 10 : 0,
    trades,
    tradeCount: n,
    avgReturnPct: Math.round(avgReturn * 100) / 100,
    avgWinPct: Math.round(avgWin * 100) / 100,
    avgLossPct: Math.round(avgLoss * 100) / 100,
    profitFactor:
      profitFactor === Infinity ? null : Math.round(profitFactor * 100) / 100,
    expectancyPct: Math.round(avgReturn * 100) / 100,
    longCount,
    shortCount,
    winCount: wins,
    lossCount,
  };
}

export function runBacktest(
  bars: OHLCVBar[],
  rules: StrategyRules,
  _indicators?: IndicatorResults,
): BacktestResult {
  const closes = bars.map((b) => b.close);
  const rsiPeriod = rules.rsiPeriod ?? 14;
  if (!Number.isInteger(rsiPeriod) || rsiPeriod < 2)
    throw new Error("RSI 기간은 2 이상의 정수여야 합니다.");
  const rsis = RSI.calculate({ values: closes, period: rsiPeriod });
  const ma50 = SMA.calculate({ values: closes, period: 50 });
  const ma200 = SMA.calculate({ values: closes, period: 200 });
  const valueAt = (values: number[], index: number) =>
    values[index - (bars.length - values.length)] ?? null;
  const test = (expr: string, index: number) =>
    evalSimpleCondition(
      expr,
      valueAt(rsis, index),
      closes[index],
      valueAt(ma50, index),
      valueAt(ma200, index),
    );
  const cfg: ExecutionOptions = {
    horizon: rules.horizon ?? 12,
    stopLossPct: rules.stop_loss_pct ?? 1.5,
    takeProfitPct: rules.take_profit_pct ?? 1.5,
    feeBps: rules.feeBps ?? 0,
    slippageBps: rules.slippageBps ?? 0,
  };
  executionOptions(cfg);
  evalSimpleCondition(rules.entry, null, 0, null, null);
  evalSimpleCondition(rules.exit, null, 0, null, null);
  const trades: BacktestTrade[] = [];
  let pendingCount = 0;
  let pendingReturns: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    // Evaluate both expressions so malformed exit rules fail even with no entries.
    test(rules.exit, i);
    if (!test(rules.entry, i)) continue;
    const outcome = simulateTrade(
      bars,
      { id: "formula", version: EXECUTION_VERSION, barIndex: i, direction: "bullish" },
      cfg,
      (at) => test(rules.exit, at),
    );
    if (outcome.status === "pending") {
      pendingCount++;
      pendingReturns = outcome.equityReturns ?? [];
      break;
    }
    if (outcome.status !== "closed") continue;
    trades.push(outcome.trade);
    i = outcome.trade.exitBarIndex! - 1;
  }
  return {
    ...summarizeBacktestTrades(trades, pendingReturns),
    pendingCount,
    executionVersion: EXECUTION_VERSION,
    assumptions: {
      ...cfg,
      rsiPeriod,
      entryRule: rules.entry,
      exitRule: rules.exit,
      entry: "next-open",
      drawdown: "close-mark-to-market",
    },
  };
}

export const DEFAULT_STRATEGY: StrategyRules = {
  entry: "RSI < 30 AND close > SMA200",
  exit: "RSI > 70 OR close < SMA50",
  stop_loss_pct: 1.5,
  take_profit_pct: 1.5,
};
