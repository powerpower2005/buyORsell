import type { BacktestResult, BacktestTrade, OHLCVBar } from "../types";
import type { IndicatorResults } from "../types";

export interface StrategyRules {
  entry: string;
  exit: string;
  stop_loss_pct?: number;
  take_profit_pct?: number;
}

function rsi(bars: OHLCVBar[], period: number, idx: number): number | null {
  if (idx < period) return null;
  const slice = bars.slice(0, idx + 1).map((b) => b.close);
  let gains = 0;
  let losses = 0;
  for (let i = slice.length - period; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function smaAt(bars: OHLCVBar[], period: number, idx: number): number | null {
  if (idx < period - 1) return null;
  const slice = bars.slice(idx - period + 1, idx + 1);
  return slice.reduce((s, b) => s + b.close, 0) / period;
}

function evalSimpleCondition(
  expr: string,
  bars: OHLCVBar[],
  idx: number,
): boolean {
  const close = bars[idx].close;
  const r = rsi(bars, 14, idx);
  const s200 = smaAt(bars, 200, idx);
  const s50 = smaAt(bars, 50, idx);

  const parts = expr.toUpperCase().split(/\s+AND\s+/i);
  return parts.every((part) => {
    part = part.trim();
    if (part.includes("RSI <")) {
      const n = parseInt(part.match(/\d+/)?.[0] ?? "30", 10);
      return r != null && r < n;
    }
    if (part.includes("RSI >")) {
      const n = parseInt(part.match(/\d+/)?.[0] ?? "70", 10);
      return r != null && r > n;
    }
    if (part.includes("CLOSE > SMA200") || part.includes("CLOSE > SMA 200")) {
      return s200 != null && close > s200;
    }
    if (part.includes("CLOSE < SMA50") || part.includes("CLOSE < SMA 50")) {
      return s50 != null && close < s50;
    }
    return false;
  });
}

/** Shared metrics from a closed trade list. */
export function summarizeBacktestTrades(trades: BacktestTrade[]): BacktestResult {
  let equity = 100;
  let peak = 100;
  let maxDd = 0;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winSum = 0;
  let lossSum = 0;
  let longCount = 0;
  let shortCount = 0;

  for (const t of trades) {
    if (t.returnPct > 0) {
      wins++;
      grossProfit += t.returnPct;
      winSum += t.returnPct;
    } else if (t.returnPct < 0) {
      grossLoss += Math.abs(t.returnPct);
      lossSum += t.returnPct;
    }
    if (t.side === "long") longCount++;
    else if (t.side === "short") shortCount++;

    equity *= 1 + t.returnPct / 100;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
  }

  const n = trades.length;
  const lossCount = n - wins;
  const avgReturn = n ? trades.reduce((s, t) => s + t.returnPct, 0) / n : 0;
  const avgWin = wins ? winSum / wins : 0;
  const avgLoss = lossCount ? lossSum / lossCount : 0;
  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? Infinity
        : 0;

  return {
    totalReturnPct: Math.round((equity - 100) * 100) / 100,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    winRate: n ? Math.round((wins / n) * 1000) / 10 : 0,
    trades,
    tradeCount: n,
    avgReturnPct: Math.round(avgReturn * 100) / 100,
    avgWinPct: Math.round(avgWin * 100) / 100,
    avgLossPct: Math.round(avgLoss * 100) / 100,
    profitFactor:
      profitFactor === Infinity
        ? null
        : Math.round(profitFactor * 100) / 100,
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
  const trades: BacktestTrade[] = [];
  let position: {
    entryIdx: number;
    entryPrice: number;
  } | null = null;

  const stopPct = rules.stop_loss_pct ?? 0;
  const takePct = rules.take_profit_pct ?? 0;

  for (let i = 200; i < bars.length; i++) {
    const price = bars[i].close;

    if (position) {
      const ret = ((price - position.entryPrice) / position.entryPrice) * 100;
      const hitStop = stopPct > 0 && ret <= -stopPct;
      const hitTake = takePct > 0 && ret >= takePct;
      const exitSignal = evalSimpleCondition(rules.exit, bars, i);

      if (hitStop || hitTake || exitSignal) {
        trades.push({
          entryDate: bars[position.entryIdx].date,
          exitDate: bars[i].date,
          entryPrice: position.entryPrice,
          exitPrice: price,
          returnPct: Math.round(ret * 100) / 100,
          side: "long",
          entryBarIndex: position.entryIdx,
          exitBarIndex: i,
          exitReason: hitStop ? "stop" : hitTake ? "take" : "signal",
        });
        position = null;
      }
    } else if (evalSimpleCondition(rules.entry, bars, i)) {
      position = { entryIdx: i, entryPrice: price };
    }
  }

  if (position) {
    const price = bars.at(-1)!.close;
    const ret = ((price - position.entryPrice) / position.entryPrice) * 100;
    trades.push({
      entryDate: bars[position.entryIdx].date,
      exitDate: bars.at(-1)!.date,
      entryPrice: position.entryPrice,
      exitPrice: price,
      returnPct: Math.round(ret * 100) / 100,
      side: "long",
      entryBarIndex: position.entryIdx,
      exitBarIndex: bars.length - 1,
      exitReason: "eod",
    });
  }

  return summarizeBacktestTrades(trades);
}

export const DEFAULT_STRATEGY: StrategyRules = {
  entry: "RSI < 30 AND close > SMA200",
  exit: "RSI > 70 OR close < SMA50",
  stop_loss_pct: 5,
  take_profit_pct: 15,
};
