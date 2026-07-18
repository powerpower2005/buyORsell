import {
  BB_STRATEGY_ORDER,
  type BbStrategyId,
} from "./bbStrategyMeta";

const STORAGE_KEY = "gf:config:bb-strategies-chart";

type Overrides = Partial<Record<BbStrategyId, boolean>>;

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

/** Default off so markers stay opt-in. */
export function getBbStrategyVisibility(): Record<BbStrategyId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<BbStrategyId, boolean>;
  for (const id of BB_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setBbStrategyVisible(
  id: BbStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setBbStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of BB_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
