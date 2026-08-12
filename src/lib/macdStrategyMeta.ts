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
      "파란 MACD가 노란 시그널을 위·아래로 뚫을 때 진입. 0선·200일선은 참고용입니다.",
    markerBull: "MX↑",
    markerBear: "MX↓",
    typicalDirection: "neutral",
  },
  macd_zero_line: {
    label: "MACD zero-line",
    labelKo: "기준선(0선) 매매",
    description:
      "MACD가 0을 뚫거나, 뚫은 뒤 시그널 근처 눌림·반등에서 같은 방향으로 재진입합니다.",
    markerBull: "MZ↑",
    markerBear: "MZ↓",
    typicalDirection: "neutral",
  },
  macd_rsi_confirm: {
    label: "MACD + RSI OB/OS",
    labelKo: "과매수·과매도 확인",
    description:
      "RSI가 너무 내렸다/올랐다에서 나온 뒤 MACD 교차로 확인되면 진입합니다.",
    markerBull: "MR↑",
    markerBear: "MR↓",
    typicalDirection: "neutral",
  },
  macd_divergence: {
    label: "MACD divergence",
    labelKo: "MACD 다이버전스",
    description:
      "주가와 MACD가 어긋난 뒤 시그널 교차로 확인할 때 진입합니다.",
    markerBull: "MD↑",
    markerBear: "MD↓",
    typicalDirection: "neutral",
  },
  macd_trend_break: {
    label: "MACD trend break",
    labelKo: "MACD 돌파 매매",
    description:
      "가격 구조 돌파와 MACD·시그널 방향이 같이 맞을 때 진입합니다.",
    markerBull: "MB↑",
    markerBear: "MB↓",
    typicalDirection: "neutral",
  },
};
