import { INDICATOR_COLOR_OPTIONS } from "./indicatorColors";

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

export const TRENDLINE_COLORS = {
  ascending: "#34d399",
  descending: "#fb7185",
} as const;

/** Defaults + shared overlay palette for trendline color pickers. */
export const TRENDLINE_COLOR_OPTIONS: readonly string[] = [
  TRENDLINE_COLORS.ascending,
  TRENDLINE_COLORS.descending,
  ...INDICATOR_COLOR_OPTIONS,
];

const STORAGE_KEY = "gf:config:trendlines-chart";
const LINE_STORAGE_KEY = "gf:config:trendlines-lines";
const KIND_COLOR_KEY = "gf:config:trendlines-kind-colors";
const LINE_COLOR_KEY = "gf:config:trendlines-line-colors";

type Overrides = Partial<Record<TrendlineChartToggleId, boolean>>;
type LineOverrides = Record<string, boolean>;
type KindColorOverrides = Partial<Record<TrendlineChartToggleId, string>>;
type LineColorOverrides = Record<string, string>;

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

function loadLineOverrides(): LineOverrides {
  try {
    const raw = localStorage.getItem(LINE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LineOverrides) : {};
  } catch {
    return {};
  }
}

function saveLineOverrides(overrides: LineOverrides): void {
  localStorage.setItem(LINE_STORAGE_KEY, JSON.stringify(overrides));
}

function loadKindColors(): KindColorOverrides {
  try {
    const raw = localStorage.getItem(KIND_COLOR_KEY);
    return raw ? (JSON.parse(raw) as KindColorOverrides) : {};
  } catch {
    return {};
  }
}

function saveKindColors(overrides: KindColorOverrides): void {
  localStorage.setItem(KIND_COLOR_KEY, JSON.stringify(overrides));
}

function loadLineColors(): LineColorOverrides {
  try {
    const raw = localStorage.getItem(LINE_COLOR_KEY);
    return raw ? (JSON.parse(raw) as LineColorOverrides) : {};
  } catch {
    return {};
  }
}

function saveLineColors(overrides: LineColorOverrides): void {
  localStorage.setItem(LINE_COLOR_KEY, JSON.stringify(overrides));
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

/** Per-line visibility keyed by Trendline.id. Missing id defaults to visible. */
export function isTrendlineLineVisible(lineId: string): boolean {
  const overrides = loadLineOverrides();
  return overrides[lineId] ?? true;
}

export function getTrendlineLineVisibility(
  lineIds: string[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of lineIds) {
    out[id] = isTrendlineLineVisible(id);
  }
  return out;
}

export function setTrendlineLineVisible(
  lineId: string,
  visible: boolean,
): void {
  const overrides = loadLineOverrides();
  overrides[lineId] = visible;
  saveLineOverrides(overrides);
}

export function setTrendlineLinesVisible(
  lineIds: string[],
  visible: boolean,
): void {
  const overrides = loadLineOverrides();
  for (const id of lineIds) {
    overrides[id] = visible;
  }
  saveLineOverrides(overrides);
}

export function getTrendlineKindColor(kind: TrendlineChartToggleId): string {
  return loadKindColors()[kind] ?? TRENDLINE_COLORS[kind];
}

export function getTrendlineKindColors(): Record<
  TrendlineChartToggleId,
  string
> {
  return {
    ascending: getTrendlineKindColor("ascending"),
    descending: getTrendlineKindColor("descending"),
  };
}

export function setTrendlineKindColor(
  kind: TrendlineChartToggleId,
  color: string,
): void {
  const overrides = loadKindColors();
  overrides[kind] = color;
  saveKindColors(overrides);
}

export function resolveTrendlineColor(
  lineId: string,
  kind: TrendlineChartToggleId,
): string {
  return loadLineColors()[lineId] ?? getTrendlineKindColor(kind);
}

export function getTrendlineLineColors(
  lines: { id: string; kind: TrendlineChartToggleId }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines) {
    out[line.id] = resolveTrendlineColor(line.id, line.kind);
  }
  return out;
}

export function setTrendlineLineColor(lineId: string, color: string): void {
  const overrides = loadLineColors();
  overrides[lineId] = color;
  saveLineColors(overrides);
}
