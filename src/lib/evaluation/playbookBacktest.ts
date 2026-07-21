import type { BacktestResult, BacktestTrade, OHLCVBar, TrendLabel } from "../types";
import { summarizeBacktestTrades } from "./backtest";

export interface PlaybookEntrySignal {
  barIndex: number;
  date: string;
  direction: TrendLabel;
  id: string;
  label: string;
}

export interface PlaybookBacktestOptions {
  /** Bars after entry to force exit if no opposite signal. */
  horizon?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  /** Only bullish / bearish / both. */
  side?: "long" | "short" | "both";
}

/**
 * Enter on playbook hits; exit on stop/take, opposite signal, or horizon.
 * Long-only or short-only based on hit direction.
 */
export function runPlaybookBacktest(
  bars: OHLCVBar[],
  signals: PlaybookEntrySignal[],
  options?: PlaybookBacktestOptions,
): BacktestResult {
  const horizon = options?.horizon ?? 12;
  const stopPct = options?.stopLossPct ?? 1.5;
  const takePct = options?.takeProfitPct ?? 1.5;
  const side = options?.side ?? "both";

  const entries = [...signals]
    .filter((s) => {
      if (s.direction !== "bullish" && s.direction !== "bearish") return false;
      if (side === "long") return s.direction === "bullish";
      if (side === "short") return s.direction === "bearish";
      return true;
    })
    .sort((a, b) => a.barIndex - b.barIndex);

  const trades: BacktestTrade[] = [];
  let i = 0;

  while (i < entries.length) {
    const sig = entries[i];
    const entryIdx = sig.barIndex;
    if (entryIdx < 0 || entryIdx >= bars.length - 1) {
      i++;
      continue;
    }

    const isLong = sig.direction === "bullish";
    const entryPrice = bars[entryIdx].close;
    let exitIdx = Math.min(bars.length - 1, entryIdx + horizon);
    let exitReason = "horizon";

    for (let j = entryIdx + 1; j <= Math.min(bars.length - 1, entryIdx + horizon); j++) {
      const px = bars[j].close;
      const ret = isLong
        ? ((px - entryPrice) / entryPrice) * 100
        : ((entryPrice - px) / entryPrice) * 100;
      if (ret <= -stopPct) {
        exitIdx = j;
        exitReason = "stop";
        break;
      }
      if (ret >= takePct) {
        exitIdx = j;
        exitReason = "take";
        break;
      }
      // Opposite playbook signal closes early
      const opp = entries.find(
        (e) =>
          e.barIndex === j &&
          e.direction === (isLong ? "bearish" : "bullish"),
      );
      if (opp) {
        exitIdx = j;
        exitReason = "signal";
        break;
      }
    }

    const exitPrice = bars[exitIdx].close;
    const returnPct = isLong
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;

    trades.push({
      entryDate: bars[entryIdx].date,
      exitDate: bars[exitIdx].date,
      entryPrice,
      exitPrice,
      returnPct: Math.round(returnPct * 100) / 100,
      side: isLong ? "long" : "short",
      entryBarIndex: entryIdx,
      exitBarIndex: exitIdx,
      strategyId: sig.id,
      strategyLabel: sig.label,
      exitReason,
    });

    // Skip overlapping entries until after exit
    while (i < entries.length && entries[i].barIndex <= exitIdx) i++;
  }

  return summarizeBacktestTrades(trades);
}
