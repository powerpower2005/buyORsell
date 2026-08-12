import type { TrendLabel } from "./types";

/** Separate Ichimoku playbooks (do not merge). */
export type IchimokuStrategyId =
  | "ichi_tk_cross"
  | "ichi_chikou_cross"
  | "ichi_kumo_twist"
  | "ichi_price_kumo_break"
  | "ichi_trend_turn"
  | "ichi_breakout"
  | "ichi_kumo_retest"
  | "ichi_kumo_sr";

export const ICHIMOKU_STRATEGY_ORDER: IchimokuStrategyId[] = [
  "ichi_tk_cross",
  "ichi_chikou_cross",
  "ichi_kumo_twist",
  "ichi_price_kumo_break",
  "ichi_trend_turn",
  "ichi_breakout",
  "ichi_kumo_retest",
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
      "전환선이 기준선을 위로 뚫으면 매수, 아래로 뚫으면 매도합니다.",
    markerBull: "TK↑",
    markerBear: "TK↓",
    typicalDirection: "neutral",
  },
  ichi_chikou_cross: {
    label: "Chikou span cross",
    labelKo: "후행스팬 호전·역전",
    description:
      "지금 종가를 26봉 전에 그린 선이 그때 캔들을 위·아래로 뚫을 때 진입합니다.",
    markerBull: "CK↑",
    markerBear: "CK↓",
    typicalDirection: "neutral",
  },
  ichi_kumo_twist: {
    label: "Kumo twist",
    labelKo: "구름 색 전환(비틀림)",
    description:
      "구름이 강세색으로 바뀌면 상승 우위, 약세색으로 바뀌면 하락 우위입니다.",
    markerBull: "KT↑",
    markerBear: "KT↓",
    typicalDirection: "neutral",
  },
  ichi_price_kumo_break: {
    label: "Price vs Kumo break",
    labelKo: "가격 구름 돌파·이탈",
    description:
      "종가가 구름 위를 마감하면 매수, 구름 아래를 마감하면 매도. 두꺼운 구름일수록 신뢰↑.",
    markerBull: "KB↑",
    markerBear: "KB↓",
    typicalDirection: "neutral",
  },
  ichi_trend_turn: {
    label: "Four-signal trend turn",
    labelKo: "일목 추세 전환(4신호)",
    description:
      "기준선·전환교차·후행·구름 색이 짧은 구간에 같은 방향으로 모일 때 진입합니다.",
    markerBull: "TT↑",
    markerBear: "TT↓",
    typicalDirection: "neutral",
  },
  ichi_breakout: {
    label: "Chikou + Kumo breakout",
    labelKo: "일목 돌파 매매",
    description:
      "후행스팬이 강하게 뚫은 뒤 장대봉으로 구름을 돌파할 때 진입합니다.",
    markerBull: "BO↑",
    markerBear: "BO↓",
    typicalDirection: "neutral",
  },
  ichi_kumo_retest: {
    label: "Kumo breakout retest",
    labelKo: "구름 돌파 후 리테스트",
    description:
      "구름 돌파 뒤 되돌림이 구름에 닿고 다시 같은 쪽으로 마감하면 진입합니다.",
    markerBull: "RT↑",
    markerBear: "RT↓",
    typicalDirection: "neutral",
  },
  ichi_kumo_sr: {
    label: "Kumo support/resistance",
    labelKo: "구름 지지·저항",
    description:
      "구름 가장자리에 닿은 뒤 전환선이 같은 방향으로 움직이면 진입합니다.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
};
