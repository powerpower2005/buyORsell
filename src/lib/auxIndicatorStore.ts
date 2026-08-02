/** Below-chart oscillator pane toggles (separate Y-axis sections, shared time scale). */

export type AuxIndicatorId =
  | "rsi"
  | "macd"
  | "stoch"
  | "mfi"
  | "atr"
  | "obv"
  | "ad"
  | "chaikin"
  | "eom"
  | "obvMid"
  | "equivolume"
  | "keltner"
  | "vwap"
  | "forever_vwap"
  | "adx"
  | "psar"
  | "cci"
  | "supertrend"
  | "bbPercentB";

export const AUX_INDICATOR_ORDER: AuxIndicatorId[] = [
  "rsi",
  "macd",
  "stoch",
  "mfi",
  "atr",
  "obv",
  "ad",
  "chaikin",
  "eom",
  "obvMid",
  "equivolume",
  "keltner",
  "vwap",
  "forever_vwap",
  "adx",
  "psar",
  "cci",
  "supertrend",
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
  stoch: {
    labelKo: "스토캐스틱",
    description: "%K/%D — 같은 차트 안 별도 섹션 (0–100 스케일).",
  },
  mfi: {
    labelKo: "MFI",
    description: "자금흐름지수(거래량 반영 RSI) — 별도 섹션 (0–100).",
  },
  atr: {
    labelKo: "ATR",
    description: "평균진폭 — 같은 차트 안 별도 섹션.",
  },
  obv: {
    labelKo: "OBV",
    description: "누적 균형 거래량(+시그널·에너지) — 별도 섹션.",
  },
  ad: {
    labelKo: "A/D",
    description: "매집/분산(Accumulation/Distribution) — 별도 섹션.",
  },
  chaikin: {
    labelKo: "Chaikin",
    description: "차이킨 오실레이터(A/D EMA 단기−장기) — 별도 섹션.",
  },
  eom: {
    labelKo: "EOM",
    description: "Ease of Movement — EquiVolume 짝 지표, 별도 섹션.",
  },
  obvMid: {
    labelKo: "OBV Mid",
    description: "중간가(H+L)/2 기준 OBV — 별도 섹션.",
  },
  equivolume: {
    labelKo: "EquiVolume",
    description: "상자 비율·형태(키다리/정사각/뚱보) — 봉 색 + 비율 패널.",
  },
  keltner: {
    labelKo: "켈트너",
    description: "켈트너 채널(EMA+ATR) — 가격 차트 오버레이.",
  },
  vwap: {
    labelKo: "VWAP",
    description: "거래량 가중 평균가 + 표준편차 밴드 — 가격 차트 오버레이.",
  },
  forever_vwap: {
    labelKo: "포에버 VWAP",
    description:
      "세션 리셋 없는 누적 VWAP(상승=주황·하락=보라) + 기울기 전환 다이아몬드·앵커드 라인.",
  },
  adx: {
    labelKo: "ADX",
    description: "추세 강도(+DI/−DI) — 같은 차트 안 별도 섹션.",
  },
  psar: {
    labelKo: "Parabolic SAR",
    description: "파라볼릭 SAR — 가격 차트 오버레이(추세·트레일 스탑).",
  },
  cci: {
    labelKo: "CCI",
    description: "상품채널지수 — 같은 차트 안 별도 섹션.",
  },
  supertrend: {
    labelKo: "슈퍼트렌드",
    description: "Supertrend — 가격 차트 오버레이(추세 방향 + 트레일링 스탑).",
  },
  bbPercentB: {
    labelKo: "%B",
    description: "볼린저 %B — 같은 차트 안 별도 섹션.",
  },
};

/** Oscillator / aux indicator config ids that map 1:1 to aux toggles. */
export const INDICATOR_TO_AUX: Partial<Record<string, AuxIndicatorId>> = {
  rsi: "rsi",
  macd: "macd",
  stoch: "stoch",
  mfi: "mfi",
  atr: "atr",
  obv: "obv",
  ad: "ad",
  chaikin: "chaikin",
  eom: "eom",
  obvMid: "obvMid",
  equivolume: "equivolume",
  keltner: "keltner",
  vwap: "vwap",
  forever_vwap: "forever_vwap",
  adx: "adx",
  psar: "psar",
  cci: "cci",
  supertrend: "supertrend",
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

/** Default off — opt-in oscillator panes / overlays. */
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
