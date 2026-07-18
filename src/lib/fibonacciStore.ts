export const FIB_RETRACEMENT_LEVELS = [0.382, 0.5, 0.618, 0.786] as const;

export type FibLevelRatio = (typeof FIB_RETRACEMENT_LEVELS)[number];

export interface FibAnchor {
  date: string;
  barIndex: number;
  price: number;
}

export interface FibRetracement {
  /** First pick — swing low. */
  low: FibAnchor;
  /** Second pick — swing high. */
  high: FibAnchor;
}

const LEVELS_KEY = "gf:config:fib-levels";
const DRAW_KEY = "gf:config:fib-draw-mode";
const ANCHORS_KEY = "gf:config:fib-anchors";
const EXTRAS_KEY = "gf:config:fib-extras";

export type FibExtraId = "anchors" | "confluence";

export const FIB_EXTRA_ORDER: FibExtraId[] = ["anchors", "confluence"];

export const FIB_EXTRA_META: Record<
  FibExtraId,
  { labelKo: string; description: string }
> = {
  anchors: {
    labelKo: "0% / 100% 가이드",
    description: "고점·저점 기준선 (차트 선만, 숫자는 아래 범례).",
  },
  confluence: {
    labelKo: "Confluence 강조",
    description: "피보 레벨이 지지·저항에 겹칠 때 밴드 강조.",
  },
};

type LevelOverrides = Partial<Record<string, boolean>>;

function levelKey(ratio: number): string {
  return String(ratio);
}

function loadLevelOverrides(): LevelOverrides {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    return raw ? (JSON.parse(raw) as LevelOverrides) : {};
  } catch {
    return {};
  }
}

function saveLevelOverrides(overrides: LevelOverrides): void {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(overrides));
}

/** Enabled fib ratios; default all on. */
export function getFibLevelVisibility(): Record<FibLevelRatio, boolean> {
  const overrides = loadLevelOverrides();
  const out = {} as Record<FibLevelRatio, boolean>;
  for (const ratio of FIB_RETRACEMENT_LEVELS) {
    out[ratio] = overrides[levelKey(ratio)] ?? true;
  }
  return out;
}

export function setFibLevelVisible(ratio: FibLevelRatio, visible: boolean): void {
  const overrides = loadLevelOverrides();
  overrides[levelKey(ratio)] = visible;
  saveLevelOverrides(overrides);
}

export function setAllFibLevelsVisible(visible: boolean): void {
  const overrides = loadLevelOverrides();
  for (const ratio of FIB_RETRACEMENT_LEVELS) {
    overrides[levelKey(ratio)] = visible;
  }
  saveLevelOverrides(overrides);
}

type ExtraOverrides = Partial<Record<FibExtraId, boolean>>;

function loadExtraOverrides(): ExtraOverrides {
  try {
    const raw = localStorage.getItem(EXTRAS_KEY);
    return raw ? (JSON.parse(raw) as ExtraOverrides) : {};
  } catch {
    return {};
  }
}

function saveExtraOverrides(overrides: ExtraOverrides): void {
  localStorage.setItem(EXTRAS_KEY, JSON.stringify(overrides));
}

/** Default on. */
export function getFibExtraVisibility(): Record<FibExtraId, boolean> {
  const overrides = loadExtraOverrides();
  return {
    anchors: overrides.anchors ?? true,
    confluence: overrides.confluence ?? true,
  };
}

export function setFibExtraVisible(id: FibExtraId, visible: boolean): void {
  const overrides = loadExtraOverrides();
  overrides[id] = visible;
  saveExtraOverrides(overrides);
}

export function setAllFibExtrasVisible(visible: boolean): void {
  const overrides = loadExtraOverrides();
  for (const id of FIB_EXTRA_ORDER) {
    overrides[id] = visible;
  }
  saveExtraOverrides(overrides);
}

export function isFibDrawMode(): boolean {
  try {
    const raw = localStorage.getItem(DRAW_KEY);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}

export function setFibDrawMode(on: boolean): void {
  localStorage.setItem(DRAW_KEY, JSON.stringify(on));
}

export function getFibRetracement(): FibRetracement | null {
  try {
    const raw = localStorage.getItem(ANCHORS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FibRetracement;
    if (!parsed?.low?.date || !parsed?.high?.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setFibRetracement(retracement: FibRetracement): void {
  localStorage.setItem(ANCHORS_KEY, JSON.stringify(retracement));
}

export function clearFibRetracement(): void {
  localStorage.removeItem(ANCHORS_KEY);
}

/** Pending first click while drawing (not persisted). */
let pendingLow: FibAnchor | null = null;

export function getFibPendingLow(): FibAnchor | null {
  return pendingLow;
}

export function setFibPendingLow(anchor: FibAnchor | null): void {
  pendingLow = anchor;
}

export function fibLevelLabel(ratio: number): string {
  return `${(ratio * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

/**
 * Classic uptrend fib retracement from swing low → high.
 * level price = high - (high - low) * ratio
 */
export function fibRetracementPrice(
  low: number,
  high: number,
  ratio: number,
): number {
  return high - (high - low) * ratio;
}

export const FIB_LEVEL_COLORS: Record<FibLevelRatio, string> = {
  0.382: "#60a5fa",
  0.5: "#fbbf24",
  0.618: "#a78bfa",
  0.786: "#f472b6",
};

export const FIB_CONFLUENCE_COLOR = "#fbbf24";

export interface FibConfluenceHit {
  ratio: FibLevelRatio;
  fibPrice: number;
  zoneId: string;
  zoneKind: "support" | "resistance";
  zoneLow: number;
  zoneHigh: number;
  /** Overlap band used for highlight (intersection of fib slop + zone). */
  low: number;
  high: number;
}

export interface SrZoneLike {
  id: string;
  kind: "support" | "resistance";
  low: number;
  high: number;
}

/**
 * Fib level is confluence when its price sits inside an S/R zone
 * (with a tiny price buffer so near-misses still count).
 */
export function findFibConfluences(
  fib: FibRetracement,
  zones: SrZoneLike[],
  levelVisibility?: Record<FibLevelRatio, boolean>,
  bufferPct = 0.002,
): FibConfluenceHit[] {
  if (fib.high.price <= fib.low.price || !zones.length) return [];
  const hits: FibConfluenceHit[] = [];

  for (const ratio of FIB_RETRACEMENT_LEVELS) {
    if (levelVisibility && levelVisibility[ratio] === false) continue;
    const fibPrice = fibRetracementPrice(fib.low.price, fib.high.price, ratio);
    const buf = fibPrice * bufferPct;

    for (const zone of zones) {
      const inZone =
        fibPrice >= zone.low - buf && fibPrice <= zone.high + buf;
      if (!inZone) continue;
      hits.push({
        ratio,
        fibPrice,
        zoneId: zone.id,
        zoneKind: zone.kind,
        zoneLow: zone.low,
        zoneHigh: zone.high,
        // Highlight the full S/R band when fib lands inside it.
        low: zone.low,
        high: zone.high,
      });
    }
  }
  return hits;
}
