import {
  BB_BAND_ORDER,
  bbOverlayKey,
  type BbBandId,
} from "./bbOverlay";

const STORAGE_KEY = "gf:config:indicator-overlays";

/** Series key like `sma:20` / `ema:12` / `bb:upper`. Default visible when unset. */
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
  return overrides[key] ?? true;
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

export function isBbOverlayVisible(band: BbBandId): boolean {
  const overrides = loadOverrides();
  return overrides[bbOverlayKey(band)] ?? true;
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
    if (raw == null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function setVolumeOverlayVisible(visible: boolean): void {
  localStorage.setItem(VOLUME_KEY, JSON.stringify(visible));
}
