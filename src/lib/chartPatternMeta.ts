import type { PatternBias } from "./patternBias";
import type { TrendLabel } from "./types";

export type ChartPatternId =
  | "double_bottom"
  | "double_top"
  | "cup_and_handle"
  | "head_and_shoulders"
  | "triple_top"
  | "triple_bottom"
  | "rising_wedge"
  | "falling_wedge"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "broadening_triangle"
  | "pennant"
  | "flag"
  | "rectangle";

export type ChartPatternCategory = "continuation" | "reversal" | "neutral";

/** Long → short → both → neutral (sidebar grouping order). */
export const CHART_PATTERN_ORDER: ChartPatternId[] = [
  "double_bottom",
  "triple_bottom",
  "cup_and_handle",
  "falling_wedge",
  "flag",
  "rectangle",
  "double_top",
  "triple_top",
  "rising_wedge",
  "head_and_shoulders",
  "pennant",
  "symmetrical_triangle",
  "ascending_triangle",
  "descending_triangle",
  "broadening_triangle",
];

export const CHART_PATTERN_BIAS_ORDER: PatternBias[] = [
  "bullish",
  "bearish",
  "both",
  "neutral",
];

export const CHART_PATTERN_META: Record<
  ChartPatternId,
  {
    label: string;
    labelKo: string;
    category: ChartPatternCategory;
    /** Primary trade bias for sidebar grouping. */
    typicalDirection: PatternBias;
    description: string;
    markerBull: string;
    markerBear: string;
    color: string;
  }
> = {
  double_bottom: {
    label: "Double bottom",
    labelKo: "쌍바닥",
    category: "reversal",
    typicalDirection: "bullish",
    description:
      "하락 끝 W자 반전. 목선 상향 돌파 롱 · 손절=돌파 봉 저점(≤2저점) · 목표 목선–저점 높이. 거래량·RSI·MACD·리테스트.",
    markerBull: "DB↑",
    markerBear: "DB↓",
    color: "#34d399",
  },
  double_top: {
    label: "Double top",
    labelKo: "쌍봉",
    category: "reversal",
    typicalDirection: "bearish",
    description:
      "상승 끝 M자 반전. 목선 하향 돌파 숏 · 손절=돌파 봉 고점 · 목표 고점–목선. 고1 거래량≥고2면 신뢰 힌트.",
    markerBull: "2T↑",
    markerBear: "2T↓",
    color: "#f87171",
  },
  cup_and_handle: {
    label: "Cup and handle",
    labelKo: "컵앤핸들",
    category: "continuation",
    typicalDirection: "both",
    description:
      "강세: U자 컵+얕은 핸들 → 상단 돌파 롱. 약세(역컵): 둥근 천장+얕은 핸들 → 하단 이탈 숏. 컵 깊이≤선행 추세 1/2 · 핸들≤컵 1/3 · 손절 핸들 극값 · 목표 컵 깊이.",
    markerBull: "CH↑",
    markerBear: "CH↓",
    color: "#2dd4bf",
  },
  rectangle: {
    label: "Rectangle",
    labelKo: "직사각형",
    category: "continuation",
    typicalDirection: "both",
    description:
      "추세 중 수평 지지·저항 횡보(지속). 상승 후 상단 돌파 롱 / 하락 후 하단 이탈 숏. 손절≈박스 중앙(높이 1/2) · 목표=박스 높이. 쌍바닥·쌍봉(반전)과 구분.",
    markerBull: "Rect↑",
    markerBear: "Rect↓",
    color: "#a78bfa",
  },
  head_and_shoulders: {
    label: "Head and shoulders",
    labelKo: "헤드앤숄더",
    category: "reversal",
    typicalDirection: "both",
    description:
      "H&S 목선 하향 숏 / 역H&S 목선 상향 롱. 손절=돌파 봉 고·저 · 목표 머리–목선 높이. 리테스트·거래량 권장.",
    markerBull: "iHS↑",
    markerBear: "HS↓",
    color: "#f472b6",
  },
  triple_top: {
    label: "Triple top",
    labelKo: "3중 천장",
    category: "reversal",
    typicalDirection: "bearish",
    description:
      "고점 3회(사이≥7봉) 후 목선 하향. 손절=돌파 봉 고점 · 목표 고점–목선.",
    markerBull: "TT↑",
    markerBear: "TT↓",
    color: "#fb7185",
  },
  triple_bottom: {
    label: "Triple bottom",
    labelKo: "3중 바닥",
    category: "reversal",
    typicalDirection: "bullish",
    description:
      "저점 3회(사이≥7봉) 후 목선 상향. 손절=돌파 직전 봉 저점 · 목표 목선–저점. 돌파 다음 봉 확인 진입 권장.",
    markerBull: "TB↑",
    markerBear: "TB↓",
    color: "#4ade80",
  },
  rising_wedge: {
    label: "Rising wedge",
    labelKo: "상승 쐐기",
    category: "reversal",
    typicalDirection: "bearish",
    description:
      "우상향 수렴. 전형 하단 이탈 숏 · 손절=돌파 봉 고점 · 목표 초기 폭. 상단 돌파=지속 가능.",
    markerBull: "RW↑",
    markerBear: "RW↓",
    color: "#fbbf24",
  },
  falling_wedge: {
    label: "Falling wedge",
    labelKo: "하강 쐐기",
    category: "reversal",
    typicalDirection: "bullish",
    description:
      "우하향 수렴. 전형 상단 돌파 롱 · 손절=돌파 봉 저점 · 목표 초기 폭. 하단 이탈=지속 가능.",
    markerBull: "FW↑",
    markerBear: "FW↓",
    color: "#a3e635",
  },
  ascending_triangle: {
    label: "Ascending triangle",
    labelKo: "상승 삼각형",
    category: "neutral",
    typicalDirection: "neutral",
    description:
      "중립. 수평 저항+우상향 지지. 상단 돌파 롱 / 하단 이탈 숏. 손절≈구간 최근 스윙 · 목표=삼각형 높이. 종가(라인)로 보기 쉬움 · RR 1:2~1:4 우선.",
    markerBull: "AT↑",
    markerBear: "AT↓",
    color: "#60a5fa",
  },
  descending_triangle: {
    label: "Descending triangle",
    labelKo: "하락 삼각형",
    category: "neutral",
    typicalDirection: "neutral",
    description:
      "중립. 수평 지지+우하향 저항. 하단 이탈 숏 / 상단 돌파 롱. 손절≈구간 최근 스윙 · 목표=삼각형 높이. RR·종가 확인.",
    markerBull: "DT↑",
    markerBear: "DT↓",
    color: "#c084fc",
  },
  symmetrical_triangle: {
    label: "Symmetrical triangle",
    labelKo: "대칭 삼각형(수축)",
    category: "continuation",
    typicalDirection: "both",
    description:
      "지속·수축. 고↓·저↑ 수렴. 선행 추세 방향만 돌파 · 손절=스윙·돌파봉·중앙 중 타이트한 쪽 · 목표=초기 높이. 확장형과 구분.",
    markerBull: "ST↑",
    markerBear: "ST↓",
    color: "#94a3b8",
  },
  broadening_triangle: {
    label: "Broadening triangle",
    labelKo: "대칭 삼각형(확장)",
    category: "neutral",
    typicalDirection: "neutral",
    description:
      "중립·확장(메가폰). 고↑·저↓로 폭이 벌어짐. 경계 종가 돌파 후 진입 · 목표≈돌파 시 폭. 구간 스캘핑은 Help 참고(탐지는 돌파만).",
    markerBull: "BT↑",
    markerBear: "BT↓",
    color: "#f59e0b",
  },
  pennant: {
    label: "Pennant",
    labelKo: "페넌트",
    category: "continuation",
    typicalDirection: "both",
    description:
      "깃대 후 짧은 삼각 수렴 지속. 깃대 방향 돌파 · 목표≈폴의 80% · 손절=돌파 봉 극값. 완벽한 대칭 불필요.",
    markerBull: "PN↑",
    markerBear: "PN↓",
    color: "#38bdf8",
  },
  flag: {
    label: "Flag",
    labelKo: "깃발",
    category: "continuation",
    typicalDirection: "both",
    description:
      "폴(급등·급락) 후 짧은 평행 채널(플래그). 지속 · 목표≈폴의 80% · 손절=돌파 봉. 진입=패턴·청산=가격/RR(1:2~1:4).",
    markerBull: "FG↑",
    markerBear: "FG↓",
    color: "#67e8f9",
  },
};

export function chartPatternsByBias(bias: PatternBias): ChartPatternId[] {
  return CHART_PATTERN_ORDER.filter(
    (id) => CHART_PATTERN_META[id].typicalDirection === bias,
  );
}

export function chartPatternMarkerText(
  id: ChartPatternId,
  direction: TrendLabel,
): string {
  const meta = CHART_PATTERN_META[id];
  return direction === "bearish" ? meta.markerBear : meta.markerBull;
}
