import {
  PATTERN_STRATEGY_ORDER,
  type PatternStrategyId,
} from "./patternStrategyMeta";

const STORAGE_KEY = "gf:config:pattern-strategies";

type Overrides = Partial<Record<PatternStrategyId, boolean>>;

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

/** Default off — opt-in strategy markers. */
export function getPatternStrategyVisibility(): Record<
  PatternStrategyId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<PatternStrategyId, boolean>;
  for (const id of PATTERN_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setPatternStrategyVisible(
  id: PatternStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setPatternStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of PATTERN_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
