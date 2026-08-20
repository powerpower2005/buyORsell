import type { TrendLabel } from "./types";
import type { QuoteEvaluation } from "./evaluation/evaluateQuote";
import { collectStrategyHits } from "./evaluation/strategyConfluence";
import type { PatternStrategyHit } from "./evaluation/patternStrategies";
import {
  formatRewardRisk,
  levelsFromAtr2r,
  methodLabelKo,
  rewardRiskRatio,
} from "./evaluation/riskReward";
import { computeAtrSeries } from "./evaluation/pivots";

/** Recent-signal scan is daily bars only. */
export const RECENT_SIGNAL_TIMEFRAME = "1d" as const;

/** Scan/store this many bars; the UI then filters to 1–10. */
export const RECENT_SIGNAL_SCAN_BARS = 10;

export const RECENT_SIGNAL_DISPLAY_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const;
export type RecentSignalDisplayBars =
  (typeof RECENT_SIGNAL_DISPLAY_OPTIONS)[number];
export const DEFAULT_RECENT_SIGNAL_DISPLAY_BARS: RecentSignalDisplayBars = 1;

const DISPLAY_BARS_KEY = "gf:config:recent-signal-display-bars";

export function isRecentSignalDisplayBars(
  n: number,
): n is RecentSignalDisplayBars {
  return (RECENT_SIGNAL_DISPLAY_OPTIONS as readonly number[]).includes(n);
}

export function getRecentSignalDisplayBars(): RecentSignalDisplayBars {
  try {
    const raw = localStorage.getItem(DISPLAY_BARS_KEY);
    const n = raw ? Number(raw) : NaN;
    if (isRecentSignalDisplayBars(n)) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_RECENT_SIGNAL_DISPLAY_BARS;
}

export function setRecentSignalDisplayBars(
  n: number,
): RecentSignalDisplayBars {
  const next = isRecentSignalDisplayBars(n)
    ? n
    : DEFAULT_RECENT_SIGNAL_DISPLAY_BARS;
  try {
    localStorage.setItem(DISPLAY_BARS_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function recentSignalWindowLabel(bars: number): string {
  return `${bars}일`;
}

export function filterHitsByDisplayBars(
  hits: RecentStrategyHit[],
  displayBars: number,
): RecentStrategyHit[] {
  if (displayBars <= 0) return [];
  return hits.filter((h) => h.barsAgo >= 0 && h.barsAgo < displayBars);
}

export interface RecentStrategyHit {
  family: string;
  id: string;
  label: string;
  date: string;
  barIndex: number;
  barsAgo: number;
  /** Close of the signal bar. */
  close: number | null;
  direction: Exclude<TrendLabel, "neutral">;
  rewardRisk?: number | null;
  rrMethod?: "pattern" | "atr_2r";
  stopPrice?: number | null;
  targetPrice?: number | null;
  rrLabel?: string;
}

/** Latest hit per strategy that falls inside the last `windowBars` bars. */
export function recentHitsFromEvaluation(
  evaluation: QuoteEvaluation,
  windowBars = RECENT_SIGNAL_SCAN_BARS,
): RecentStrategyHit[] {
  if (!evaluation.bars.length || windowBars <= 0) return [];
  const lastIdx = evaluation.bars.length - 1;
  const best = new Map<string, RecentStrategyHit>();
  const atr = computeAtrSeries(evaluation.bars, 14);

  const patternByKey = new Map<string, PatternStrategyHit>(
    (evaluation.patternStrategies?.signals ??
      evaluation.patternStrategies?.recent ??
      []).map((h) => [`pattern:${h.id}:${h.barIndex}`, h]),
  );

  for (const h of collectStrategyHits(evaluation)) {
    if (h.direction !== "bullish" && h.direction !== "bearish") continue;
    const barsAgo = lastIdx - h.barIndex;
    if (barsAgo < 0 || barsAgo >= windowBars) continue;
    const key = `${h.family}:${h.id}`;
    const prev = best.get(key);
    if (prev && h.barIndex <= prev.barIndex) continue;

    let rewardRisk: number | null | undefined;
    let rrMethod: "pattern" | "atr_2r" | undefined;
    let stopPrice: number | null | undefined;
    let targetPrice: number | null | undefined;

    if (h.family === "pattern") {
      const ph = patternByKey.get(`pattern:${h.id}:${h.barIndex}`);
      if (ph?.id === "fake_breakout") {
        // Warning only — no entry RR plan.
      } else if (ph) {
        rewardRisk = ph.rewardRisk ?? null;
        rrMethod = ph.rrMethod;
        stopPrice = ph.stopPrice;
        targetPrice = ph.targetPrice;
        if (
          (rewardRisk == null || !Number.isFinite(rewardRisk)) &&
          ph.entryPrice != null &&
          stopPrice != null &&
          targetPrice != null
        ) {
          rewardRisk = rewardRiskRatio(
            ph.entryPrice,
            stopPrice,
            targetPrice,
            h.direction,
          );
          rrMethod = "pattern";
        }
      }
    }

    if (rewardRisk == null && h.id !== "fake_breakout") {
      const levels = levelsFromAtr2r(
        evaluation.bars,
        h.barIndex,
        h.direction,
        atr,
      );
      if (levels) {
        rewardRisk = levels.rewardRisk;
        rrMethod = levels.method;
        stopPrice = levels.stopPrice;
        targetPrice = levels.targetPrice;
      }
    }

    best.set(key, {
      family: h.family,
      id: h.id,
      label: h.label,
      date: h.date,
      barIndex: h.barIndex,
      barsAgo,
      close: evaluation.bars[h.barIndex]?.close ?? null,
      direction: h.direction,
      rewardRisk,
      rrMethod,
      stopPrice,
      targetPrice,
      rrLabel:
        rewardRisk != null
          ? `${formatRewardRisk(rewardRisk)}${rrMethod ? ` (${methodLabelKo(rrMethod)})` : ""}`
          : undefined,
    });
  }

  return [...best.values()].sort(
    (a, b) =>
      a.barsAgo - b.barsAgo ||
      a.direction.localeCompare(b.direction) ||
      a.label.localeCompare(b.label),
  );
}
