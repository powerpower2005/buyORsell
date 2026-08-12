import type { TrendLabel } from "./types";

/** Separate Stochastic playbooks (do not merge). */
export type StochStrategyId =
  | "stoch_ma20_cross"
  | "stoch_divergence"
  | "stoch_sr_bounce"
  | "stoch_triple_bottom";

export const STOCH_STRATEGY_ORDER: StochStrategyId[] = [
  "stoch_ma20_cross",
  "stoch_divergence",
  "stoch_sr_bounce",
  "stoch_triple_bottom",
];

export const STOCH_STRATEGY_META: Record<
  StochStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  stoch_ma20_cross: {
    label: "Stoch + SMA20",
    labelKo: "스토캐 + 20이평",
    description:
      "20일 평균선 위(아래) 추세일 때, 가격이 선 근처로 눌리거나 반등한 뒤 스토캐 빠른 선·느린 선이 교차하면 진입합니다.",
    markerBull: "SK↑",
    markerBear: "SK↓",
    typicalDirection: "neutral",
  },
  stoch_divergence: {
    label: "Stoch divergence",
    labelKo: "스토캐 다이버전스",
    description:
      "주가와 스토캐가 어긋날 때(가격은 더 낮은데 지표는 덜 낮음 등) 선 교차로 확인한 뒤 진입합니다.",
    markerBull: "SD↑",
    markerBear: "SD↓",
    typicalDirection: "neutral",
  },
  stoch_sr_bounce: {
    label: "Stoch S/R bounce",
    labelKo: "스토캐 지지·저항",
    description:
      "지지에 닿아 빠른 선이 20을 위로 뚫거나, 저항에 닿아 80을 아래로 뚫을 때 진입합니다.",
    markerBull: "SS↑",
    markerBear: "SS↓",
    typicalDirection: "neutral",
  },
  stoch_triple_bottom: {
    label: "Stoch triple bottom",
    labelKo: "스토캐 3중 바닥",
    description:
      "스토캐 저점이 세 번 높아진 뒤 위로 교차하면 매수, 고점이 세 번 낮아진 뒤 아래로 교차하면 매도합니다.",
    markerBull: "ST↑",
    markerBear: "ST↓",
    typicalDirection: "neutral",
  },
};
