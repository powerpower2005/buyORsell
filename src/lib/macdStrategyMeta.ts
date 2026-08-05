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
      "MACD×시그널 골든/데드. 0선·SMA200·S/R은 companion(엔트리 필터 아님).",
    markerBull: "MX↑",
    markerBear: "MX↓",
    typicalDirection: "neutral",
  },
  macd_zero_line: {
    label: "MACD zero-line",
    labelKo: "기준선(0선) 매매",
    description:
      "0선 돌파 또는 돌파 후 시그널 눌림/반등 재진입. SMA200 위 0선 하향 매수는 companion 참고.",
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
      "가격·MACD·시그널이 함께 추세 구조를 돌파할 때. SMA200·거래량은 companion.",
    markerBull: "MB↑",
    markerBear: "MB↓",
    typicalDirection: "neutral",
  },
};
