import type { CandlePatternId } from "./evaluation/candlePatterns";
import type { PatternBias } from "./patternBias";
import type { TrendLabel } from "./types";

export interface CandlePatternMeta {
  id: CandlePatternId;
  label: string;
  labelKo: string;
  description: string;
  markerText: string;
  typicalDirection: TrendLabel;
}

/** Long → short → neutral (sidebar grouping order). */
export const CANDLE_PATTERN_ORDER: CandlePatternId[] = [
  "hammer",
  "inverted_hammer",
  "bullish_engulfing",
  "bullish_harami",
  "hanging_man",
  "shooting_star",
  "bearish_engulfing",
  "bearish_harami",
  "doji",
];

export const CANDLE_PATTERN_BIAS_ORDER: PatternBias[] = [
  "bullish",
  "bearish",
  "neutral",
];

export const CANDLE_PATTERN_META: Record<CandlePatternId, CandlePatternMeta> = {
  doji: {
    id: "doji",
    label: "Doji",
    labelKo: "도지",
    description: "시가와 종가가 거의 같아 방향성이 약합니다. 추세 전환 또는 횡보 신호로 봅니다.",
    markerText: "D",
    typicalDirection: "neutral",
  },
  hammer: {
    id: "hammer",
    label: "Hammer",
    labelKo: "망치형",
    description: "하락 추세 끝에서 긴 아래꼬리가 나오면 매수세 유입·반등 가능성을 봅니다.",
    markerText: "Ham",
    typicalDirection: "bullish",
  },
  hanging_man: {
    id: "hanging_man",
    label: "Hanging Man",
    labelKo: "교수형",
    description: "상승 추세 끝에서 망치형과 비슷한 형태가 나오면 상승 피로·하락 전환 경고로 봅니다.",
    markerText: "HM",
    typicalDirection: "bearish",
  },
  inverted_hammer: {
    id: "inverted_hammer",
    label: "Inverted Hammer",
    labelKo: "역망치형",
    description: "하락 후 긴 위꼬리가 나오면 매수 시도가 있었음을 의미하며 반등 신호로 봅니다.",
    markerText: "IH",
    typicalDirection: "bullish",
  },
  shooting_star: {
    id: "shooting_star",
    label: "Shooting Star",
    labelKo: "유성형",
    description: "상승 후 긴 위꼬리가 나오면 매도 압력이 강해졌음을 의미하며 하락 신호로 봅니다.",
    markerText: "SS",
    typicalDirection: "bearish",
  },
  bullish_engulfing: {
    id: "bullish_engulfing",
    label: "Bullish Engulfing",
    labelKo: "상승 장악형",
    description: "전일 음봉을 당일 양봉이 완전히 덮으면 강한 상승 전환 신호로 봅니다.",
    markerText: "BE",
    typicalDirection: "bullish",
  },
  bearish_engulfing: {
    id: "bearish_engulfing",
    label: "Bearish Engulfing",
    labelKo: "하락 장악형",
    description: "전일 양봉을 당일 음봉이 완전히 덮으면 강한 하락 전환 신호로 봅니다.",
    markerText: "SE",
    typicalDirection: "bearish",
  },
  bullish_harami: {
    id: "bullish_harami",
    label: "Bullish Harami",
    labelKo: "상승 잉태형",
    description: "큰 음봉 안에 작은 양봉이 들어가면 하락 momentum이 약해졌음을 의미합니다.",
    markerText: "BH",
    typicalDirection: "bullish",
  },
  bearish_harami: {
    id: "bearish_harami",
    label: "Bearish Harami",
    labelKo: "하락 잉태형",
    description: "큰 양봉 안에 작은 음봉이 들어가면 상승 momentum이 약해졌음을 의미합니다.",
    markerText: "RH",
    typicalDirection: "bearish",
  },
};

export function candlePatternsByBias(bias: PatternBias): CandlePatternId[] {
  return CANDLE_PATTERN_ORDER.filter(
    (id) => CANDLE_PATTERN_META[id].typicalDirection === bias,
  );
}

export function patternLabel(id: CandlePatternId): string {
  return CANDLE_PATTERN_META[id].label;
}

export function directionColor(direction: TrendLabel): string {
  if (direction === "bullish") return "#00c471";
  if (direction === "bearish") return "#f04452";
  return "#8b95a1";
}
