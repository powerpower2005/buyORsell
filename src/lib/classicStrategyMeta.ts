import type { TrendLabel } from "./types";

/** Classical chart-theory playbooks (Dow/MA · Elliott fib · Gann · 52w · SMA200). */
export type ClassicStrategyId =
  | "ma_golden_dead"
  | "high_52w_break"
  | "sma200_support"
  | "fib_wave_pullback"
  | "gann_zone";

export const CLASSIC_STRATEGY_ORDER: ClassicStrategyId[] = [
  "ma_golden_dead",
  "high_52w_break",
  "sma200_support",
  "fib_wave_pullback",
  "gann_zone",
];

export const CLASSIC_STRATEGY_META: Record<
  ClassicStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  ma_golden_dead: {
    label: "MA golden/dead cross",
    labelKo: "이평 골든·데드",
    description:
      "단기 이평(20)이 중기 이평(50)을 위로 뚫으면 매수, 아래로 뚫으면 매도. 이미 추세 중반인 경우가 많습니다.",
    markerBull: "GC↑",
    markerBear: "DC↓",
    typicalDirection: "neutral",
  },
  high_52w_break: {
    label: "52-week / N-bar high break",
    labelKo: "52주·N봉 고점 돌파",
    description:
      "최근 N봉 고점을 종가가 위로 뚫으면 매수. 장기 신고가·모멘텀 타이밍용입니다.",
    markerBull: "52↑",
    markerBear: "52↓",
    typicalDirection: "bullish",
  },
  sma200_support: {
    label: "SMA200 support bounce",
    labelKo: "SMA200 지지 반등",
    description:
      "200일선 위 국면에서 선 근처로 눌린 뒤 양봉·종가가 이평 위면 매수합니다.",
    markerBull: "200↑",
    markerBear: "200↓",
    typicalDirection: "bullish",
  },
  fib_wave_pullback: {
    label: "Fib wave 2/4 pullback",
    labelKo: "피보 2·4파 눌림",
    description:
      "한바탕 움직인 뒤 대략 38~62% 되돌림 구간에서 반등·저항이 확인되면 진입합니다.",
    markerBull: "F2↑",
    markerBear: "F4↓",
    typicalDirection: "neutral",
  },
  gann_zone: {
    label: "Gann retracement zone",
    labelKo: "갠 되돌림 존",
    description:
      "스윙 고·저로 잡은 되돌림 구간에서 반등·저항이 확인되면 진입합니다.",
    markerBull: "GZ↑",
    markerBear: "GZ↓",
    typicalDirection: "neutral",
  },
};

export function classicStrategyMarkerText(
  id: ClassicStrategyId,
  direction: TrendLabel,
): string {
  const meta = CLASSIC_STRATEGY_META[id];
  if (direction === "bearish") return meta.markerBear;
  if (direction === "bullish") return meta.markerBull;
  return meta.markerBull;
}
