/** Below-chart value toggles for oscillators / secondary metrics (not drawn on canvas). */

export type AuxIndicatorId = "rsi" | "macd" | "mfi" | "atr" | "bbPercentB";

export const AUX_INDICATOR_ORDER: AuxIndicatorId[] = [
  "rsi",
  "macd",
  "mfi",
  "atr",
  "bbPercentB",
];

export const AUX_INDICATOR_META: Record<
  AuxIndicatorId,
  { labelKo: string; description: string }
> = {
  rsi: {
    labelKo: "RSI",
    description: "상대강도지수 최신값 (차트 아래 범례).",
  },
  macd: {
    labelKo: "MACD Hist",
    description: "MACD 히스토그램 최신값 (차트 아래 범례).",
  },
  mfi: {
    labelKo: "MFI",
    description: "자금흐름지수 최신값 (차트 아래 범례).",
  },
  atr: {
    labelKo: "ATR",
    description: "평균진폭 최신값 (차트 아래 범례).",
  },
  bbPercentB: {
    labelKo: "%B",
    description: "볼린저 %B 최신값 (차트 아래 범례).",
  },
};

const STORAGE_KEY = "gf:config:aux-indicators-legend";

type Overrides = Partial<Record<AuxIndicatorId, boolean>>;

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

/** Default on so values appear under the chart when available. */
export function getAuxIndicatorVisibility(): Record<AuxIndicatorId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<AuxIndicatorId, boolean>;
  for (const id of AUX_INDICATOR_ORDER) {
    out[id] = overrides[id] ?? true;
  }
  return out;
}

export function setAuxIndicatorVisible(
  id: AuxIndicatorId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setAuxIndicatorGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of AUX_INDICATOR_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}
