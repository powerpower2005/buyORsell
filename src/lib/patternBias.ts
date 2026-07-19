/** Sidebar / help labels for pattern long-short bias. */

export type PatternBias = "bullish" | "bearish" | "both" | "neutral";

export const PATTERN_BIAS_META: Record<
  PatternBias,
  { labelKo: string; shortKo: string; className: string }
> = {
  bullish: {
    labelKo: "롱 패턴",
    shortKo: "롱",
    className: "border-positive/40 text-positive",
  },
  bearish: {
    labelKo: "숏 패턴",
    shortKo: "숏",
    className: "border-negative/40 text-negative",
  },
  both: {
    labelKo: "양방향",
    shortKo: "양방향",
    className: "border-border text-text-tertiary",
  },
  neutral: {
    labelKo: "중립",
    shortKo: "중립",
    className: "border-border text-text-tertiary",
  },
};

export function patternBiasFromTrend(
  direction: "bullish" | "bearish" | "neutral",
): PatternBias {
  return direction;
}
