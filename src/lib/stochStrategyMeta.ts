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
      "가격이 SMA20 위(아래) 추세에서 눌림·반등 후 %K/%D 골든(데드) 크로스로 진입.",
    markerBull: "SK↑",
    markerBear: "SK↓",
    typicalDirection: "neutral",
  },
  stoch_divergence: {
    label: "Stoch divergence",
    labelKo: "스토캐 다이버전스",
    description:
      "가격 LL+%K HL(상승) 또는 가격 HH+%K LH(하락). 첫 저점은 과매도권 조건.",
    markerBull: "SD↑",
    markerBear: "SD↓",
    typicalDirection: "neutral",
  },
  stoch_sr_bounce: {
    label: "Stoch S/R bounce",
    labelKo: "스토캐 지지·저항",
    description:
      "지지 재접촉 시 %K가 20 상향, 저항 재접촉 시 %K가 80 하향 이탈할 때 진입.",
    markerBull: "SS↑",
    markerBear: "SS↓",
    typicalDirection: "neutral",
  },
  stoch_triple_bottom: {
    label: "Stoch triple bottom",
    labelKo: "스토캐 3중 바닥",
    description:
      "%K 저점이 세 번 높아진 뒤 %K/%D 골든 크로스에서 롱(대칭 3중 천장은 숏).",
    markerBull: "ST↑",
    markerBear: "ST↓",
    typicalDirection: "neutral",
  },
};
