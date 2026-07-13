import type { CandlePatternId } from "./evaluation/candlePatterns";
import { CANDLE_PATTERN_ORDER } from "./candlePatternMeta";

const STORAGE_KEY = "gf:config:candle-patterns-chart";

type ChartVisibilityOverrides = Partial<Record<CandlePatternId, boolean>>;

function loadOverrides(): ChartVisibilityOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChartVisibilityOverrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: ChartVisibilityOverrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getChartPatternVisibility(): Record<CandlePatternId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<CandlePatternId, boolean>;
  for (const id of CANDLE_PATTERN_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setChartPatternVisible(id: CandlePatternId, visible: boolean): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function resetChartPatternVisibility(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function anyChartPatternVisible(
  visibility: Record<CandlePatternId, boolean>,
): boolean {
  return CANDLE_PATTERN_ORDER.some((id) => visibility[id]);
}
