import type { TrendLabel } from "./types";

/** Separate Ichimoku playbooks (do not merge). */
export type IchimokuStrategyId =
  | "ichi_tk_cross"
  | "ichi_chikou_cross"
  | "ichi_kumo_twist"
  | "ichi_price_kumo_break"
  | "ichi_trend_turn"
  | "ichi_breakout"
  | "ichi_kumo_sr";

export const ICHIMOKU_STRATEGY_ORDER: IchimokuStrategyId[] = [
  "ichi_tk_cross",
  "ichi_chikou_cross",
  "ichi_kumo_twist",
  "ichi_price_kumo_break",
  "ichi_trend_turn",
  "ichi_breakout",
  "ichi_kumo_sr",
];

export const ICHIMOKU_STRATEGY_META: Record<
  IchimokuStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  ichi_tk_cross: {
    label: "Tenkan/Kijun cross",
    labelKo: "전환·기준선 호전·역전",
    description:
      "전환선이 기준선을 상향 돌파(호전)하면 롱, 하향 돌파(역전)하면 숏.",
    markerBull: "TK↑",
    markerBear: "TK↓",
    typicalDirection: "neutral",
  },
  ichi_chikou_cross: {
    label: "Chikou span cross",
    labelKo: "후행스팬 호전·역전",
    description:
      "후행스팬이 26봉 전 캔들을 상향 돌파하면 롱, 하향 이탈하면 숏.",
    markerBull: "CK↑",
    markerBear: "CK↓",
    typicalDirection: "neutral",
  },
  ichi_kumo_twist: {
    label: "Kumo twist",
    labelKo: "구름 색 전환(비틀림)",
    description:
      "선행스팬1이 2를 상향 돌파하면 양운 전환(롱), 하향이면 음운 전환(숏).",
    markerBull: "KT↑",
    markerBear: "KT↓",
    typicalDirection: "neutral",
  },
  ichi_price_kumo_break: {
    label: "Price vs Kumo break",
    labelKo: "가격 구름 돌파·이탈",
    description:
      "종가가 구름 상단을 돌파하면 롱, 하단을 이탈하면 숏. 두꺼운 구름일수록 신뢰↑.",
    markerBull: "KB↑",
    markerBear: "KB↓",
    typicalDirection: "neutral",
  },
  ichi_trend_turn: {
    label: "Four-signal trend turn",
    labelKo: "일목 추세 전환(4신호)",
    description:
      "기준선 돌파 + TK 호전/역전 + 후행스팬 호전/역전 + 구름 색 전환이 짧은 구간에 모일 때.",
    markerBull: "TT↑",
    markerBear: "TT↓",
    typicalDirection: "neutral",
  },
  ichi_breakout: {
    label: "Chikou + Kumo breakout",
    labelKo: "일목 돌파 매매",
    description:
      "후행스팬 강한 돌파 후 장대봉으로 구름을 돌파. 손익비 2:1 참고.",
    markerBull: "BO↑",
    markerBear: "BO↓",
    typicalDirection: "neutral",
  },
  ichi_kumo_sr: {
    label: "Kumo support/resistance",
    labelKo: "구름 지지·저항",
    description:
      "양운 지지·음운 저항 터치 후 전환선 돌파/이탈 시 진입.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
};
