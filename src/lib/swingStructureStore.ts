export type SwingChartToggleId =
  | "HH"
  | "HL"
  | "LH"
  | "LL"
  | "bullish_transition"
  | "bearish_transition";

export const SWING_CHART_TOGGLE_ORDER: SwingChartToggleId[] = [
  "HH",
  "HL",
  "LH",
  "LL",
  "bullish_transition",
  "bearish_transition",
];

export const SWING_CHART_TOGGLE_META: Record<
  SwingChartToggleId,
  { label: string; labelKo: string; description: string }
> = {
  HH: {
    label: "Higher High",
    labelKo: "HH",
    description: "이전 스윙 고점보다 높은 고점. 상승 힘이 이어짐을 나타냅니다.",
  },
  HL: {
    label: "Higher Low",
    labelKo: "HL",
    description: "이전 스윙 저점보다 높은 저점. 상승 구조 유지 신호입니다.",
  },
  LH: {
    label: "Lower High",
    labelKo: "LH",
    description: "이전 스윙 고점보다 낮은 고점. 상승 약화·하락 전환 징후입니다.",
  },
  LL: {
    label: "Lower Low",
    labelKo: "LL",
    description: "이전 스윙 저점보다 낮은 저점. 하락 구조 유지 신호입니다.",
  },
  bullish_transition: {
    label: "Bullish transition",
    labelKo: "하락→상승 전환",
    description: "LL+LH 구조에서 HH+HL 구조로 바뀌는 시점입니다.",
  },
  bearish_transition: {
    label: "Bearish transition",
    labelKo: "상승→하락 전환",
    description: "HH+HL 구조에서 LL+LH 구조로 바뀌는 시점입니다.",
  },
};

const STORAGE_KEY = "gf:config:swing-structure-chart";

type Overrides = Partial<Record<SwingChartToggleId, boolean>>;

function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Overrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getSwingChartVisibility(): Record<SwingChartToggleId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<SwingChartToggleId, boolean>;
  for (const id of SWING_CHART_TOGGLE_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setSwingChartVisible(
  id: SwingChartToggleId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function anySwingChartVisible(
  visibility: Record<SwingChartToggleId, boolean>,
): boolean {
  return SWING_CHART_TOGGLE_ORDER.some((id) => visibility[id]);
}
