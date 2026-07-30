import {
  CLASSIC_STRATEGY_ORDER,
  type ClassicStrategyId,
} from "./classicStrategyMeta";
import {
  enableIndicatorsForStrategy,
  enableIndicatorsForStrategies,
} from "./strategyIndicatorDeps";

const STORAGE_KEY = "gf:config:classic-strategies";

type Overrides = Partial<Record<ClassicStrategyId, boolean>>;

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

/** Default off — opt-in. */
export function getClassicStrategyVisibility(): Record<
  ClassicStrategyId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<ClassicStrategyId, boolean>;
  for (const id of CLASSIC_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setClassicStrategyVisible(
  id: ClassicStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategy("classic", id);
}

export function setClassicStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of CLASSIC_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategies("classic", CLASSIC_STRATEGY_ORDER);
}
