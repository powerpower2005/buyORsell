import {
  VOLUME_STRATEGY_ORDER,
  type VolumeStrategyId,
} from "./volumeStrategyMeta";

const STORAGE_KEY = "gf:config:volume-strategies";

type Overrides = Partial<Record<VolumeStrategyId, boolean>>;

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
export function getVolumeStrategyVisibility(): Record<
  VolumeStrategyId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<VolumeStrategyId, boolean>;
  for (const id of VOLUME_STRATEGY_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setVolumeStrategyVisible(
  id: VolumeStrategyId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setVolumeStrategyGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of VOLUME_STRATEGY_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
