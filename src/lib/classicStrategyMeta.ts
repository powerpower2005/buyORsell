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
      "SMA20이 SMA50을 상향(골든)·하향(데드) 돌파. 정배열·역배열 전환 확인용(실전은 종종 추세 중반).",
    markerBull: "GC↑",
    markerBear: "DC↓",
    typicalDirection: "neutral",
  },
  high_52w_break: {
    label: "52-week / N-bar high break",
    labelKo: "52주·N봉 고점 돌파",
    description:
      "직전 N봉(일봉≈252·주봉≈52·월봉≈24) 고점을 종가가 상향 돌파. 장기 신고가·모멘텀 타이밍용.",
    markerBull: "52↑",
    markerBear: "52↓",
    typicalDirection: "bullish",
  },
  sma200_support: {
    label: "SMA200 support bounce",
    labelKo: "SMA200 지지 반등",
    description:
      "종가>SMA200 국면에서 가격이 SMA200 근처로 눌린 뒤 양봉·종가≥이평 확인 시 롱. 장기 추세 필터+눌림 타이밍.",
    markerBull: "200↑",
    markerBear: "200↓",
    typicalDirection: "bullish",
  },
  fib_wave_pullback: {
    label: "Fib wave 2/4 pullback",
    labelKo: "피보 2·4파 눌림",
    description:
      "스윙 추진 뒤 38.2~61.8% 되돌림 구간에서 반등/저항 확인 시 진입(엘리어트 2·4파 감각).",
    markerBull: "F2↑",
    markerBear: "F4↓",
    typicalDirection: "neutral",
  },
  gann_zone: {
    label: "Gann retracement zone",
    labelKo: "갠 되돌림 존",
    description:
      "스윙 고·저로 1×1·1×2 각도 기반 RZH~RZL 구간을 잡고, 구간 내 반등/저항 확인 시 진입. 각도선 터치도 표시.",
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
