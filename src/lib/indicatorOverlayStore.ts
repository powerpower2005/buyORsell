import {
  BB_BAND_ORDER,
  bbOverlayKey,
  type BbBandId,
} from "./bbOverlay";

const STORAGE_KEY = "gf:config:indicator-overlays";

/** Series key like `sma:20` / `ema:12` / `bb:upper`. Default off when unset. */
type Overrides = Record<string, boolean>;

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

export function overlaySeriesKey(
  pluginId: "sma" | "ema",
  period: number,
): string {
  return `${pluginId}:${period}`;
}

export function isIndicatorOverlayVisible(
  pluginId: "sma" | "ema",
  period: number,
): boolean {
  const key = overlaySeriesKey(pluginId, period);
  const overrides = loadOverrides();
  return overrides[key] ?? false;
}

export function getIndicatorOverlayVisibility(
  pluginId: "sma" | "ema",
  periods: number[],
): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  for (const p of periods) {
    out[p] = isIndicatorOverlayVisible(pluginId, p);
  }
  return out;
}

export function setIndicatorOverlayVisible(
  pluginId: "sma" | "ema",
  period: number,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[overlaySeriesKey(pluginId, period)] = visible;
  saveOverrides(overrides);
}

export function setIndicatorOverlayGroupVisible(
  pluginId: "sma" | "ema",
  periods: number[],
  visible: boolean,
): void {
  const overrides = loadOverrides();
  for (const p of periods) {
    overrides[overlaySeriesKey(pluginId, p)] = visible;
  }
  saveOverrides(overrides);
}

/**
 * When a period is renamed in config (e.g. SMA 3 → 120), move the chart
 * overlay toggle key. Unset/true → stay visible so the line does not vanish.
 */
export function remapIndicatorOverlayPeriod(
  pluginId: "sma" | "ema",
  fromPeriod: number,
  toPeriod: number,
): void {
  if (fromPeriod === toPeriod) return;
  const overrides = loadOverrides();
  const fromKey = overlaySeriesKey(pluginId, fromPeriod);
  const toKey = overlaySeriesKey(pluginId, toPeriod);
  const prev = overrides[fromKey];
  overrides[toKey] = prev !== false;
  delete overrides[fromKey];
  saveOverrides(overrides);
}

export function isBbOverlayVisible(band: BbBandId): boolean {
  const overrides = loadOverrides();
  return overrides[bbOverlayKey(band)] ?? false;
}

export function getBbOverlayVisibility(): Record<BbBandId, boolean> {
  const out = {} as Record<BbBandId, boolean>;
  for (const band of BB_BAND_ORDER) {
    out[band] = isBbOverlayVisible(band);
  }
  return out;
}

export function setBbOverlayVisible(band: BbBandId, visible: boolean): void {
  const overrides = loadOverrides();
  overrides[bbOverlayKey(band)] = visible;
  saveOverrides(overrides);
}

export function setBbOverlayGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const band of BB_BAND_ORDER) {
    overrides[bbOverlayKey(band)] = visible;
  }
  saveOverrides(overrides);
}

const VOLUME_KEY = "gf:config:chart-volume";

export function isVolumeOverlayVisible(): boolean {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function setVolumeOverlayVisible(visible: boolean): void {
  localStorage.setItem(VOLUME_KEY, JSON.stringify(visible));
}
