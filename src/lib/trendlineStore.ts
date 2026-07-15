export type TrendlineChartToggleId = "ascending" | "descending";

export const TRENDLINE_CHART_TOGGLE_ORDER: TrendlineChartToggleId[] = [
  "ascending",
  "descending",
];

export const TRENDLINE_CHART_TOGGLE_META: Record<
  TrendlineChartToggleId,
  { label: string; labelKo: string; description: string }
> = {
  ascending: {
    label: "Ascending support",
    labelKo: "상승 추세선",
    description: "스윙 저점을 이은 상승 지지 추세선 (터치·유지 점수 상위).",
  },
  descending: {
    label: "Descending resistance",
    labelKo: "하락 추세선",
    description: "스윙 고점을 이은 하락 저항 추세선 (터치·유지 점수 상위).",
  },
};

const STORAGE_KEY = "gf:config:trendlines-chart";

type Overrides = Partial<Record<TrendlineChartToggleId, boolean>>;

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

/** Default on so auto-detected lines are visible. */
export function getTrendlineChartVisibility(): Record<
  TrendlineChartToggleId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<TrendlineChartToggleId, boolean>;
  for (const id of TRENDLINE_CHART_TOGGLE_ORDER) {
    out[id] = overrides[id] ?? true;
  }
  return out;
}

export function setTrendlineChartVisible(
  id: TrendlineChartToggleId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export const TRENDLINE_COLORS = {
  ascending: "#34d399",
  descending: "#fb7185",
} as const;
