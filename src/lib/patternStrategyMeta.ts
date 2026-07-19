import type { TrendLabel } from "./types";

/** Trading playbooks layered on classical chart-pattern detections. */
export type PatternStrategyId =
  | "breakout_entry"
  | "retest_entry"
  | "volume_breakout";

export const PATTERN_STRATEGY_ORDER: PatternStrategyId[] = [
  "breakout_entry",
  "retest_entry",
  "volume_breakout",
];

export const PATTERN_STRATEGY_META: Record<
  PatternStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  breakout_entry: {
    label: "Neckline / level breakout",
    labelKo: "목선·레벨 돌파 진입",
    description:
      "패턴 목선·저항·지지를 종가로 돌파한 봉에서 바로 진입. 공격적 진입.",
    markerBull: "BE↑",
    markerBear: "BE↓",
    typicalDirection: "neutral",
  },
  retest_entry: {
    label: "Retest entry",
    labelKo: "리테스트 안전 진입",
    description:
      "돌파 후 되돌림으로 레벨을 재테스트하고 확인 봉이 나올 때 진입. 안정적.",
    markerBull: "RT↑",
    markerBear: "RT↓",
    typicalDirection: "neutral",
  },
  volume_breakout: {
    label: "Volume-confirmed breakout",
    labelKo: "거래량 확인 돌파",
    description:
      "돌파 봉 거래량이 최근 평균보다 클 때만 신호. 가짜 돌파를 줄이는 필터.",
    markerBull: "VB↑",
    markerBear: "VB↓",
    typicalDirection: "neutral",
  },
};

export function patternStrategyMarkerText(
  id: PatternStrategyId,
  direction: TrendLabel,
): string {
  const meta = PATTERN_STRATEGY_META[id];
  return direction === "bearish" ? meta.markerBear : meta.markerBull;
}
