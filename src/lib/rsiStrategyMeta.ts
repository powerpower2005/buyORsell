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
      "RSI가 30 아래에서 올라오면 매수, 70 위에서 내려오면 매도. 강한 추세에서는 실패가 잦아 횡보에서만 참고하세요.",
    markerBull: "R30↑",
    markerBear: "R70↓",
    typicalDirection: "neutral",
  },
  super_rsi_obos: {
    label: "Super RSI dynamic OB/OS",
    labelKo: "슈퍼 RSI 유동 과매수·과매도",
    description:
      "시장에 맞춰 움직이는 ‘너무 올랐다/내렸다’ 기준을 가중 RSI가 뚫고 돌아올 때 진입합니다.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
  super_rsi_squeeze_mid: {
    label: "Super RSI squeeze mid-cross",
    labelKo: "슈퍼 RSI 수렴→중심선 돌파",
    description:
      "위·아래 기준이 좁아졌다가 벌어질 때, 가중 RSI가 중심선을 뚫으면 진입합니다.",
    markerBull: "SM↑",
    markerBear: "SM↓",
    typicalDirection: "neutral",
  },
  rsi_divergence: {
    label: "RSI divergence",
    labelKo: "RSI 다이버전스",
    description:
      "주가와 RSI가 어긋날 때(가격은 더 낮은데 RSI는 덜 낮음 등) 반전 후보로 봅니다.",
    markerBull: "RD↑",
    markerBear: "RD↓",
    typicalDirection: "neutral",
  },
  double_rsi_cross: {
    label: "Double RSI cross",
    labelKo: "이중 RSI 교차",
    description:
      "단기 RSI(7)가 장기 RSI(21)를 위·아래로 뚫을 때 진입. 추세장에 유리합니다.",
    markerBull: "DX↑",
    markerBear: "DX↓",
    typicalDirection: "neutral",
  },
};
