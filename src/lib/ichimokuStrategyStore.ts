import {
  ICHIMOKU_STRATEGY_ORDER,
  type IchimokuStrategyId,
} from "./ichimokuStrategyMeta";

const STORAGE_KEY = "gf:config:ichimoku-strategies";

type Overrides = Partial<Record<IchimokuStrategyId, boolean>>;

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
export function getIchimokuStrategyVisibility(): Record<
  IchimokuStrategyId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<IchimokuStrategyId, boolean>;
  for (const id of ICHIMOKU_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setIchimokuStrategyVisible(
  id: IchimokuStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setIchimokuStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of ICHIMOKU_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
