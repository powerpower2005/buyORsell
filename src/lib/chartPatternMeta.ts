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
  | "pennant"
  | "flag";

/** Long → short → both (sidebar grouping order). */
export const CHART_PATTERN_ORDER: ChartPatternId[] = [
  "double_bottom",
  "triple_bottom",
  "cup_and_handle",
  "falling_wedge",
  "ascending_triangle",
  "flag",
  "double_top",
  "triple_top",
  "rising_wedge",
  "descending_triangle",
  "head_and_shoulders",
  "symmetrical_triangle",
  "pennant",
];

export const CHART_PATTERN_BIAS_ORDER: PatternBias[] = [
  "bullish",
  "bearish",
  "both",
];

export const CHART_PATTERN_META: Record<
  ChartPatternId,
  {
    label: string;
    labelKo: string;
    category: "continuation" | "reversal";
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
      "하락 끝 W자 반전. 목선 상향 돌파 롱 · 손절 두 번째 저점 · 목표 저점–목선 높이.",
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
      "상승 끝 M자 반전. 목선 하향 돌파 숏 · 손절 고점 위 · 목표 고점–목선 높이.",
    markerBull: "2T↑",
    markerBear: "2T↓",
    color: "#f87171",
  },
  cup_and_handle: {
    label: "Cup and handle",
    labelKo: "컵 앤 핸들",
    category: "continuation",
    typicalDirection: "bullish",
    description:
      "U자 컵+얕은 핸들 지속. 핸들 상단 돌파 롱 · 손절 핸들 저점 · 목표 컵 깊이. 핸들은 컵의 1/3 이내.",
    markerBull: "CH↑",
    markerBear: "CH↓",
    color: "#2dd4bf",
  },
  head_and_shoulders: {
    label: "Head and shoulders",
    labelKo: "헤드앤숄더",
    category: "reversal",
    typicalDirection: "both",
    description:
      "HS 목선 하향 숏 / iHS 목선 상향 롱. 목표 머리–목선 높이. 리테스트 진입 권장.",
    markerBull: "iHS↑",
    markerBear: "HS↓",
    color: "#f472b6",
  },
  triple_top: {
    label: "Triple top",
    labelKo: "3중 천장",
    category: "reversal",
    typicalDirection: "bearish",
    description: "목선 하향 돌파 숏. 손절 세 번째 고점, 목표가 고점–목선 높이.",
    markerBull: "TT↑",
    markerBear: "TT↓",
    color: "#fb7185",
  },
  triple_bottom: {
    label: "Triple bottom",
    labelKo: "3중 바닥",
    category: "reversal",
    typicalDirection: "bullish",
    description: "목선 상향 돌파 롱. 손절 세 번째 저점, 목표가 목선–저점 높이.",
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
      "우상향 수렴 쐐기. 전형은 하단 이탈 숏이지만 모양만으로 단정 금지 · 경계 종가 돌파 확인 · 목표가 초기 폭. 상단 돌파는 지속.",
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
      "우하향 수렴 쐐기. 전형은 상단 돌파 롱이지만 모양만으로 단정 금지 · 경계 종가 돌파 확인 · 목표가 초기 폭. 하단 이탈은 지속.",
    markerBull: "FW↑",
    markerBear: "FW↓",
    color: "#a3e635",
  },
  ascending_triangle: {
    label: "Ascending triangle",
    labelKo: "상승 삼각형",
    category: "continuation",
    typicalDirection: "bullish",
    description:
      "수평 저항+우상향 지지. 방향 단정 금지 · 저항 종가 돌파 확인 후 롱 · 목표가 높이. 거래량·리테스트 권장.",
    markerBull: "AT↑",
    markerBear: "AT↓",
    color: "#60a5fa",
  },
  descending_triangle: {
    label: "Descending triangle",
    labelKo: "하락 삼각형",
    category: "continuation",
    typicalDirection: "bearish",
    description:
      "수평 지지+우하향 저항. 방향 단정 금지 · 지지 종가 이탈 확인 후 숏 · 목표가 높이. 거래량·리테스트 권장.",
    markerBull: "DT↑",
    markerBear: "DT↓",
    color: "#c084fc",
  },
  symmetrical_triangle: {
    label: "Symmetrical triangle",
    labelKo: "대칭 삼각 수렴",
    category: "continuation",
    typicalDirection: "both",
    description:
      "고↓·저↑ 수렴. 방향 예측 금지 · 상·하단 종가 돌파 확인 후 진입 · 목표가 초기 높이. 페이크 돌파 주의.",
    markerBull: "ST↑",
    markerBear: "ST↓",
    color: "#94a3b8",
  },
  pennant: {
    label: "Pennant",
    labelKo: "페넌트",
    category: "continuation",
    typicalDirection: "both",
    description:
      "깃대 후 짧은 삼각 수렴 지속. 깃대 방향 돌파 진입 · 목표가 깃대 길이.",
    markerBull: "PN↑",
    markerBear: "PN↓",
    color: "#38bdf8",
  },
  flag: {
    label: "Flag",
    labelKo: "깃발형",
    category: "continuation",
    typicalDirection: "both",
    description:
      "깃대(급등·급락) 후 짧은 평행 채널 조정. 깃발 상·하단 돌파 시 깃대 방향 재개 · 목표가 깃대 길이.",
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
