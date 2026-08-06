import type { CandlePatternId } from "./evaluation/candlePatterns";
import type { PatternBias } from "./patternBias";
import type { TrendLabel } from "./types";
import { CHART_SURFACE, SIGNAL } from "@/lib/chart/chartTheme";

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
  "dragonfly_doji",
  "bullish_engulfing",
  "bullish_harami",
  "piercing",
  "tweezers_bottom",
  "bullish_kicker",
  "morning_star",
  "bullish_marubozu",
  "three_white_soldiers",
  "rising_three_methods",
  "hanging_man",
  "shooting_star",
  "gravestone_doji",
  "bearish_engulfing",
  "bearish_harami",
  "dark_cloud_cover",
  "tweezers_top",
  "bearish_kicker",
  "evening_star",
  "bearish_marubozu",
  "three_black_crows",
  "falling_three_methods",
  "doji",
  "spinning_top",
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
    description:
      "시가와 종가가 거의 같아 십자 형태. 불확실·추세 말 반전 후보. 자리·다음 봉 확인이 핵심. 잠자리/묘비는 별도 id.",
    markerText: "D",
    typicalDirection: "neutral",
  },
  dragonfly_doji: {
    id: "dragonfly_doji",
    label: "Dragonfly Doji",
    labelKo: "잠자리 도지",
    description:
      "도지+긴 아래꼬리·위꼬리 거의 없음. 하락 바닥에서 매수 유입·반등 후보. 다음 봉이 고가 위 종가 확인·손절은 저가(교재식 Notes).",
    markerText: "Df",
    typicalDirection: "bullish",
  },
  gravestone_doji: {
    id: "gravestone_doji",
    label: "Gravestone Doji",
    labelKo: "묘비 도지",
    description:
      "도지+긴 위꼬리·아래꼬리 거의 없음. 상승 상단에서 매도 압력·조정 후보. 다음 봉 확인·손절은 고가.",
    markerText: "Gv",
    typicalDirection: "bearish",
  },
  spinning_top: {
    id: "spinning_top",
    label: "Spinning Top",
    labelKo: "스피닝 탑",
    description:
      "작은 몸통에 위·아래 심지가 모두 깁니다. 매수·매도 균형·불확실성 신호로, 단독 진입보다 맥락 확인용입니다.",
    markerText: "ST",
    typicalDirection: "neutral",
  },
  hammer: {
    id: "hammer",
    label: "Hammer",
    labelKo: "망치형",
    description:
      "긴 아래꼬리·짧은 몸통. 하락 후 매수 유입 후보(색 비중요). 다음 봉이 고가 위 종가 확인·손절은 망치 저가. 지지·거래량 confirm.",
    markerText: "Ham",
    typicalDirection: "bullish",
  },
  hanging_man: {
    id: "hanging_man",
    label: "Hanging Man",
    labelKo: "교수형",
    description:
      "망치와 같은 형태가 상승 뒤에 나오면 피로·하락 경고. 중간 추세에선 의미↓. 저항·거래량 확인.",
    markerText: "HM",
    typicalDirection: "bearish",
  },
  inverted_hammer: {
    id: "inverted_hammer",
    label: "Inverted Hammer",
    labelKo: "역망치형",
    description:
      "하락 후 긴 위꼬리. 매수 시도 힌트(색 비중요). 다음 봉·지지·RSI 확인.",
    markerText: "IH",
    typicalDirection: "bullish",
  },
  shooting_star: {
    id: "shooting_star",
    label: "Shooting Star",
    labelKo: "유성형",
    description:
      "상승 후 긴 위꼬리. 매도 압력. 다음 봉이 저가 아래 종가 확인·손절은 유성 고가. 저항·거래량·RSI.",
    markerText: "SS",
    typicalDirection: "bearish",
  },
  bullish_engulfing: {
    id: "bullish_engulfing",
    label: "Bullish Engulfing",
    labelKo: "상승 장악형",
    description:
      "음봉을 양봉이 몸통 전체 장악. 바닥에서 반전 후보. 2봉 거래량↑면 신뢰↑(companion).",
    markerText: "BE",
    typicalDirection: "bullish",
  },
  bearish_engulfing: {
    id: "bearish_engulfing",
    label: "Bearish Engulfing",
    labelKo: "하락 장악형",
    description:
      "양봉을 음봉이 몸통 전체 장악. 상단에서 반전 후보. 2봉 거래량↑면 신뢰↑.",
    markerText: "SE",
    typicalDirection: "bearish",
  },
  bullish_harami: {
    id: "bullish_harami",
    label: "Bullish Harami",
    labelKo: "상승 잉태형",
    description:
      "큰 음봉 안에 작은 양봉. 하락 모멘텀 약화. 단독보다 RSI·지지·다음 봉 확인(쓰리 인사이드 업 감각).",
    markerText: "BH",
    typicalDirection: "bullish",
  },
  bearish_harami: {
    id: "bearish_harami",
    label: "Bearish Harami",
    labelKo: "하락 잉태형",
    description:
      "큰 양봉 안에 작은 음봉. 상승 모멘텀 약화. 저항·RSI·다음 봉 확인.",
    markerText: "RH",
    typicalDirection: "bearish",
  },
  piercing: {
    id: "piercing",
    label: "Piercing Pattern",
    labelKo: "피어싱",
    description:
      "음봉 뒤 양봉이 이전 몸통 50%+ 회복(완전 장악 전). 하락 끝 반등 후보. 지지·거래량.",
    markerText: "Pc",
    typicalDirection: "bullish",
  },
  dark_cloud_cover: {
    id: "dark_cloud_cover",
    label: "Dark Cloud Cover",
    labelKo: "먹구름형",
    description:
      "양봉 뒤 음봉이 이전 몸통 50%+ 잠식. 상승 끝 조정 후보. 저항·거래량.",
    markerText: "DC",
    typicalDirection: "bearish",
  },
  tweezers_bottom: {
    id: "tweezers_bottom",
    label: "Tweezers Bottom",
    labelKo: "트위저 바텀",
    description:
      "연속 봉 저가 거의 동일. 이중 바닥 감각 — 지지·거래량↑면 신뢰↑. 색 비중요.",
    markerText: "TwB",
    typicalDirection: "bullish",
  },
  tweezers_top: {
    id: "tweezers_top",
    label: "Tweezers Top",
    labelKo: "트위저 탑",
    description:
      "연속 봉 고가 거의 동일. 이중 천정 감각 — 저항·거래량↑. 색 비중요.",
    markerText: "TwT",
    typicalDirection: "bearish",
  },
  bullish_marubozu: {
    id: "bullish_marubozu",
    label: "Bullish Marubozu",
    labelKo: "양봉 마루보즈",
    description:
      "심지가 거의 없는 장대 양봉. 강한 매수 우위·지속 후보입니다. 거래량·ADX·추세선과 확인.",
    markerText: "Mb+",
    typicalDirection: "bullish",
  },
  bearish_marubozu: {
    id: "bearish_marubozu",
    label: "Bearish Marubozu",
    labelKo: "음봉 마루보즈",
    description:
      "심지가 거의 없는 장대 음봉. 강한 매도 우위·지속 후보입니다. 거래량·ADX·추세선과 확인.",
    markerText: "Mb-",
    typicalDirection: "bearish",
  },
  bullish_kicker: {
    id: "bullish_kicker",
    label: "Bullish Kicker",
    labelKo: "강세 키커",
    description:
      "음봉 뒤 시가가 이전 시가 위로 갭·양봉. 매도→매수 급전환. 2봉 거래량↑·마루보즈면 신뢰↑(companion). 바닥에서 의미↑.",
    markerText: "Kk+",
    typicalDirection: "bullish",
  },
  bearish_kicker: {
    id: "bearish_kicker",
    label: "Bearish Kicker",
    labelKo: "약세 키커",
    description:
      "양봉 뒤 시가가 이전 시가 아래로 갭·음봉. 매수→매도 급전환. 거래량·상단 자리 확인. 일봉 갭은 드물 수 있음.",
    markerText: "Kk-",
    typicalDirection: "bearish",
  },
  morning_star: {
    id: "morning_star",
    label: "Morning Star",
    labelKo: "샛별형",
    description:
      "큰 음봉 → 작은 몸통 → 양봉 회복. 하락 끝 반등 후보입니다. 갭은 필수가 아니며 지지·거래량으로 확인.",
    markerText: "MS",
    typicalDirection: "bullish",
  },
  evening_star: {
    id: "evening_star",
    label: "Evening Star",
    labelKo: "저녁별형",
    description:
      "큰 양봉 → 작은 몸통 → 음봉 되돌림. 상승 끝 조정 후보입니다. 저항·거래량으로 확인.",
    markerText: "ES",
    typicalDirection: "bearish",
  },
  three_white_soldiers: {
    id: "three_white_soldiers",
    label: "Three White Soldiers",
    labelKo: "적삼병",
    description:
      "강한 양봉 3연속·종가 상승. 상승 지속·전환 후보입니다. 거래량·ADX·이평 방향과 같이 보세요.",
    markerText: "3W",
    typicalDirection: "bullish",
  },
  three_black_crows: {
    id: "three_black_crows",
    label: "Three Black Crows",
    labelKo: "흑삼병",
    description:
      "강한 음봉 3연속·종가 하락. 하락 지속·전환 후보입니다. 거래량·ADX·이평 방향과 같이 보세요.",
    markerText: "3C",
    typicalDirection: "bearish",
  },
  rising_three_methods: {
    id: "rising_three_methods",
    label: "Rising Three Methods",
    labelKo: "상승 삼법형",
    description:
      "장대 양봉 뒤 작은 조정 봉(2~3) 후 다시 장대 양봉. 상승 지속 후보—ADX·거래량으로 확인.",
    markerText: "R3",
    typicalDirection: "bullish",
  },
  falling_three_methods: {
    id: "falling_three_methods",
    label: "Falling Three Methods",
    labelKo: "하락 삼법형",
    description:
      "장대 음봉 뒤 작은 반등 봉(2~3) 후 다시 장대 음봉. 하락 지속 후보—ADX·거래량으로 확인.",
    markerText: "F3",
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
  if (direction === "bullish") return SIGNAL.bullish;
  if (direction === "bearish") return SIGNAL.bearish;
  return CHART_SURFACE.text;
}

/** Brighter marker/bar accents so pattern days stand out from normal candles. */
export function patternAccentColor(direction: TrendLabel): string {
  if (direction === "bullish") return SIGNAL.bullish;
  if (direction === "bearish") return SIGNAL.bearish;
  return SIGNAL.neutral;
}

/** Chart marker arrow size for candle / classical patterns. */
export const PATTERN_MARKER_SIZE = 3;
