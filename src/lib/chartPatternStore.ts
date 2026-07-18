import {
  CHART_PATTERN_ORDER,
  type ChartPatternId,
} from "./chartPatternMeta";

const STORAGE_KEY = "gf:config:classical-chart-patterns";

type Overrides = Partial<Record<ChartPatternId, boolean>>;

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

/** Default off — opt-in markers/overlays. */
export function getClassicalChartPatternVisibility(): Record<
  ChartPatternId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<ChartPatternId, boolean>;
  for (const id of CHART_PATTERN_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setClassicalChartPatternVisible(
  id: ChartPatternId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setClassicalChartPatternGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of CHART_PATTERN_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
