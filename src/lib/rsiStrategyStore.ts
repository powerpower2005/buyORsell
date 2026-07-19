import { RSI_STRATEGY_ORDER, type RsiStrategyId } from "./rsiStrategyMeta";

const STORAGE_KEY = "gf:config:rsi-strategies";

type Overrides = Partial<Record<RsiStrategyId, boolean>>;

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
export function getRsiStrategyVisibility(): Record<RsiStrategyId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<RsiStrategyId, boolean>;
  for (const id of RSI_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setRsiStrategyVisible(
  id: RsiStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setRsiStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of RSI_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
