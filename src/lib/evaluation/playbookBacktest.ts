import type { BacktestResult, OHLCVBar } from "../types";
import { summarizeBacktestTrades } from "./backtest";
import {
  executionOptions,
  simulateTrade,
  type ExecutionSignal,
  type ExecutionOptions,
} from "./execution";
import { EXECUTION_VERSION } from "../versions";

export interface PlaybookEntrySignal extends ExecutionSignal {
  date: string;
  label: string;
}

export interface PlaybookBacktestOptions extends ExecutionOptions {
  side?: "long" | "short" | "both";
}

export function runPlaybookBacktest(
  bars: OHLCVBar[],
  signals: PlaybookEntrySignal[],
  options?: PlaybookBacktestOptions,
): BacktestResult {
  const cfg = executionOptions(options);
  const entries = signals
    .filter((s) => s.id !== "fake_breakout" && s.direction !== "neutral")
    .sort(
      (a, b) =>
        (a.confirmedBarIndex ?? a.barIndex) -
          (b.confirmedBarIndex ?? b.barIndex) || a.id.localeCompare(b.id),
    );
  const grouped = new Map<number, PlaybookEntrySignal[]>();
  for (const s of entries) {
    const at = s.confirmedBarIndex ?? s.barIndex;
    grouped.set(at, [...(grouped.get(at) ?? []), s]);
  }
  const trades = [];
  let occupiedUntil = -1;
  let pendingCount = 0;
  let pendingReturns: number[] = [];
  let skippedConflicts = 0;
  for (const [at, group] of grouped) {
    if (at < occupiedUntil) continue;
    if (new Set(group.map((s) => s.direction)).size > 1) {
      skippedConflicts++;
      continue;
    }
    const sig = group[0];
    if (options?.side === "long" && sig.direction !== "bullish") continue;
    if (options?.side === "short" && sig.direction !== "bearish") continue;
    const outcome = simulateTrade(bars, sig, cfg, (index) =>
      (grouped.get(index) ?? []).some((s) => s.direction !== sig.direction),
    );
    if (outcome.status === "invalid") continue;
    if (outcome.status === "pending") {
      pendingCount++;
      pendingReturns = outcome.equityReturns ?? [];
      break;
    }
    trades.push(outcome.trade);
    occupiedUntil = outcome.trade.exitBarIndex!;
  }
  return {
    ...summarizeBacktestTrades(trades, pendingReturns),
    executionVersion: EXECUTION_VERSION,
    pendingCount,
    skippedConflicts,
    assumptions: {
      ...cfg,
      entry: "next-open",
      collision: "skip",
      sameDirection: "lexical-id-first",
      drawdown: "close-mark-to-market",
      side: options?.side ?? "both",
    },
  };
}
