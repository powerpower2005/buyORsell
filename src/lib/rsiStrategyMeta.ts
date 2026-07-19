import type { TrendLabel } from "./types";

/** Separate RSI / Super-RSI playbooks (do not merge). */
export type RsiStrategyId =
  | "rsi_classic_obos"
  | "super_rsi_obos"
  | "super_rsi_squeeze_mid"
  | "rsi_divergence"
  | "double_rsi_cross";

export const RSI_STRATEGY_ORDER: RsiStrategyId[] = [
  "rsi_classic_obos",
  "super_rsi_obos",
  "super_rsi_squeeze_mid",
  "rsi_divergence",
  "double_rsi_cross",
];

export const RSI_STRATEGY_META: Record<
  RsiStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  rsi_classic_obos: {
    label: "Classic RSI OB/OS",
    labelKo: "고전 RSI 과매수·과매도",
    description:
      "고정 70/30 돌파·이탈. 널리 알려져 추세장에서 실패가 잦음. 박스권 참고용.",
    markerBull: "R30↑",
    markerBear: "R70↓",
    typicalDirection: "neutral",
  },
  super_rsi_obos: {
    label: "Super RSI dynamic OB/OS",
    labelKo: "슈퍼 RSI 유동 과매수·과매도",
    description:
      "가중 RSI가 유동 과매수선 하향 이탈→숏, 유동 과매도선 상향 이탈→롱.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
  super_rsi_squeeze_mid: {
    label: "Super RSI squeeze mid-cross",
    labelKo: "슈퍼 RSI 수렴→중심선 돌파",
    description:
      "유동 밴드 폭이 축소된 뒤 발산하며 가중 RSI가 중심선을 돌파할 때 진입.",
    markerBull: "SM↑",
    markerBear: "SM↓",
    typicalDirection: "neutral",
  },
  rsi_divergence: {
    label: "RSI divergence",
    labelKo: "RSI 다이버전스",
    description:
      "가격 LL+RSI HL(상승) 또는 가격 HH+RSI LH(하락). 모멘텀 약화·반전 후보.",
    markerBull: "RD↑",
    markerBear: "RD↓",
    typicalDirection: "neutral",
  },
  double_rsi_cross: {
    label: "Double RSI cross",
    labelKo: "이중 RSI 교차",
    description:
      "단기 RSI(7)와 장기 RSI(21) 교차. 추세장에 유리, 횡보에선 승률 낮음.",
    markerBull: "DX↑",
    markerBear: "DX↓",
    typicalDirection: "neutral",
  },
};
