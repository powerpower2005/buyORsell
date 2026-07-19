import type { TrendLabel } from "./types";

/** Separate MACD playbooks (do not merge). */
export type MacdStrategyId =
  | "macd_signal_cross"
  | "macd_zero_line"
  | "macd_rsi_confirm"
  | "macd_divergence"
  | "macd_trend_break";

export const MACD_STRATEGY_ORDER: MacdStrategyId[] = [
  "macd_signal_cross",
  "macd_zero_line",
  "macd_rsi_confirm",
  "macd_divergence",
  "macd_trend_break",
];

export const MACD_STRATEGY_META: Record<
  MacdStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  macd_signal_cross: {
    label: "MACD signal cross",
    labelKo: "시그널 선 크로스",
    description:
      "MACD가 시그널 상향(골든)·하향(데드) 돌파. 0선 위 골든·0선 아래 데드면 신뢰↑.",
    markerBull: "MX↑",
    markerBear: "MX↓",
    typicalDirection: "neutral",
  },
  macd_zero_line: {
    label: "MACD zero-line",
    labelKo: "기준선(0선) 매매",
    description:
      "MACD가 0선 돌파, 또는 0선 돌파 후 시그널 부근 눌림/반등에서 재진입.",
    markerBull: "MZ↑",
    markerBear: "MZ↓",
    typicalDirection: "neutral",
  },
  macd_rsi_confirm: {
    label: "MACD + RSI OB/OS",
    labelKo: "과매수·과매도 확인",
    description:
      "RSI 과매도 탈출 후 MACD 골든→롱, RSI 과매수 이탈 후 MACD 데드→숏.",
    markerBull: "MR↑",
    markerBear: "MR↓",
    typicalDirection: "neutral",
  },
  macd_divergence: {
    label: "MACD divergence",
    labelKo: "MACD 다이버전스",
    description:
      "가격 LL+MACD HL(상승) 또는 가격 HH+MACD LH(하락) 후 시그널 크로스로 확인.",
    markerBull: "MD↑",
    markerBear: "MD↓",
    typicalDirection: "neutral",
  },
  macd_trend_break: {
    label: "MACD trend break",
    labelKo: "MACD 돌파 매매",
    description:
      "가격·MACD·시그널이 함께 하락/상승 추세 구조를 돌파할 때 진입.",
    markerBull: "MB↑",
    markerBear: "MB↓",
    typicalDirection: "neutral",
  },
};
