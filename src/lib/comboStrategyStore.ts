import {
  COMBO_STRATEGY_ORDER,
  type ComboStrategyId,
} from "./comboStrategyMeta";
import {
  enableIndicatorsForStrategy,
  enableIndicatorsForStrategies,
  releaseIndicatorsForStrategy,
  releaseIndicatorsForStrategies,
} from "./strategyIndicatorDeps";

const STORAGE_KEY = "gf:config:combo-strategies";

type Overrides = Partial<Record<ComboStrategyId, boolean>>;

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
export function getComboStrategyVisibility(): Record<
  ComboStrategyId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<ComboStrategyId, boolean>;
  for (const id of COMBO_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setComboStrategyVisible(
  id: ComboStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategy("combo", id);
  else releaseIndicatorsForStrategy("combo", id);
}

export function setComboStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of COMBO_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategies("combo", COMBO_STRATEGY_ORDER);
  else releaseIndicatorsForStrategies("combo", COMBO_STRATEGY_ORDER);
}

/** Toggle a subset (e.g. strategies listed under one aux indicator). */
export function setComboStrategyIdsVisible(
  ids: readonly ComboStrategyId[],
  visible: boolean,
): void {
  const overrides = loadOverrides();
  for (const id of ids) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
  if (visible) enableIndicatorsForStrategies("combo", ids);
  else releaseIndicatorsForStrategies("combo", ids);
}
