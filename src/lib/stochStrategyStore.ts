import {
  STOCH_STRATEGY_ORDER,
  type StochStrategyId,
} from "./stochStrategyMeta";

const STORAGE_KEY = "gf:config:stoch-strategies";

type Overrides = Partial<Record<StochStrategyId, boolean>>;

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
export function getStochStrategyVisibility(): Record<StochStrategyId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<StochStrategyId, boolean>;
  for (const id of STOCH_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setStochStrategyVisible(
  id: StochStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setStochStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of STOCH_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
