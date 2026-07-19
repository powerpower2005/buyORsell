/** Below-chart oscillator pane toggles (separate Y-axis sections, shared time scale). */

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
    description: "상대강도지수 — 같은 차트 안 별도 섹션 (0–100 스케일).",
  },
  macd: {
    labelKo: "MACD",
    description: "MACD/시그널/히스토그램 — 같은 차트 안 별도 섹션.",
  },
  mfi: {
    labelKo: "MFI",
    description: "자금흐름지수 — 같은 차트 안 별도 섹션 (0–100 스케일).",
  },
  atr: {
    labelKo: "ATR",
    description: "평균진폭 — 같은 차트 안 별도 섹션.",
  },
  bbPercentB: {
    labelKo: "%B",
    description: "볼린저 %B — 같은 차트 안 별도 섹션.",
  },
};

/** Oscillator indicator config ids that map 1:1 to aux pane toggles. */
export const INDICATOR_TO_AUX: Partial<Record<string, AuxIndicatorId>> = {
  rsi: "rsi",
  macd: "macd",
  mfi: "mfi",
  atr: "atr",
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

/** Default off — opt-in oscillator panes. */
export function getAuxIndicatorVisibility(): Record<AuxIndicatorId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<AuxIndicatorId, boolean>;
  for (const id of AUX_INDICATOR_ORDER) {
    out[id] = overrides[id] ?? false;
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
