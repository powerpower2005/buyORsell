import {
  MACD_STRATEGY_ORDER,
  type MacdStrategyId,
} from "./macdStrategyMeta";
import {
  enableIndicatorsForStrategy,
  enableIndicatorsForStrategies,
} from "./strategyIndicatorDeps";

const STORAGE_KEY = "gf:config:macd-strategies";

type Overrides = Partial<Record<MacdStrategyId, boolean>>;

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
export function getMacdStrategyVisibility(): Record<MacdStrategyId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<MacdStrategyId, boolean>;
  for (const id of MACD_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setMacdStrategyVisible(
  id: MacdStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategy("macd", id);
}

export function setMacdStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of MACD_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategies("macd", MACD_STRATEGY_ORDER);
}
