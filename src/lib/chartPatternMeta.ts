import type { TrendLabel } from "./types";

export type ChartPatternId =
  | "double_bottom"
  | "cup_and_handle"
  | "head_and_shoulders"
  | "triple_top"
  | "triple_bottom"
  | "rising_wedge"
  | "falling_wedge"
  | "ascending_triangle"
  | "descending_triangle"
  | "pennant";

export const CHART_PATTERN_ORDER: ChartPatternId[] = [
  "double_bottom",
  "cup_and_handle",
  "head_and_shoulders",
  "triple_top",
  "triple_bottom",
  "rising_wedge",
  "falling_wedge",
  "ascending_triangle",
  "descending_triangle",
  "pennant",
];

export const CHART_PATTERN_META: Record<
  ChartPatternId,
  {
    label: string;
    labelKo: string;
    category: "continuation" | "reversal";
    description: string;
    markerBull: string;
    markerBear: string;
    color: string;
  }
> = {
  double_bottom: {
    label: "Double bottom",
    labelKo: "쌍바닥",
    category: "continuation",
    description: "목선 상향 돌파 시 롱. 손절 첫 저점, 목표가 저점–목선 높이.",
    markerBull: "DB↑",
    markerBear: "DB↓",
    color: "#34d399",
  },
  cup_and_handle: {
    label: "Cup and handle",
    labelKo: "컵 앤 핸들",
    category: "continuation",
    description: "핸들 상단 돌파 시 롱. 손절 핸들 저점, 목표가 컵 깊이.",
    markerBull: "CH↑",
    markerBear: "CH↓",
    color: "#2dd4bf",
  },
  head_and_shoulders: {
    label: "Head and shoulders",
    labelKo: "헤드앤숄더",
    category: "reversal",
    description:
      "목선 하향 이탈 숏 / 역헤드앤숄더는 상향 돌파 롱. 목표 머리–목선 높이.",
    markerBull: "iHS↑",
    markerBear: "HS↓",
    color: "#f472b6",
  },
  triple_top: {
    label: "Triple top",
    labelKo: "3중 천장",
    category: "reversal",
    description: "목선 하향 돌파 숏. 손절 세 번째 고점, 목표가 고점–목선 높이.",
    markerBull: "TT↑",
    markerBear: "TT↓",
    color: "#fb7185",
  },
  triple_bottom: {
    label: "Triple bottom",
    labelKo: "3중 바닥",
    category: "reversal",
    description: "목선 상향 돌파 롱. 손절 세 번째 저점, 목표가 목선–저점 높이.",
    markerBull: "TB↑",
    markerBear: "TB↓",
    color: "#4ade80",
  },
  rising_wedge: {
    label: "Rising wedge",
    labelKo: "상승 쐐기",
    category: "reversal",
    description: "하단 지지 이탈 숏. 손절 패턴 고점, 목표가 초기 쐐기 폭.",
    markerBull: "RW↑",
    markerBear: "RW↓",
    color: "#fbbf24",
  },
  falling_wedge: {
    label: "Falling wedge",
    labelKo: "하강 쐐기",
    category: "reversal",
    description: "상단 저항 돌파 롱. 손절 패턴 저점, 목표가 초기 쐐기 폭.",
    markerBull: "FW↑",
    markerBear: "FW↓",
    color: "#a3e635",
  },
  ascending_triangle: {
    label: "Ascending triangle",
    labelKo: "상승 삼각형",
    category: "continuation",
    description: "수평 저항 돌파 롱. 손절 상승 지지 이탈, 목표가 삼각형 높이.",
    markerBull: "AT↑",
    markerBear: "AT↓",
    color: "#60a5fa",
  },
  descending_triangle: {
    label: "Descending triangle",
    labelKo: "하락 삼각형",
    category: "continuation",
    description: "수평 지지 이탈 숏. 손절 하락 저항 돌파, 목표가 삼각형 높이.",
    markerBull: "DT↑",
    markerBear: "DT↓",
    color: "#c084fc",
  },
  pennant: {
    label: "Pennant",
    labelKo: "페넌트",
    category: "continuation",
    description: "깃대 후 수렴 돌파 시 깃대 방향으로 진입. 목표가 깃대 길이.",
    markerBull: "PN↑",
    markerBear: "PN↓",
    color: "#38bdf8",
  },
};

export function chartPatternMarkerText(
  id: ChartPatternId,
  direction: TrendLabel,
): string {
  const meta = CHART_PATTERN_META[id];
  return direction === "bearish" ? meta.markerBear : meta.markerBull;
}
