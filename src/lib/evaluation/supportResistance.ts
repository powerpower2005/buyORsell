import type { OHLCVBar } from "../types";
import { requireNonEmptyArray } from "../require";

export type SrZoneKind = "support" | "resistance";

export interface SrZone {
  id: string;
  kind: SrZoneKind;
  low: number;
  high: number;
  mid: number;
  touches: number;
  highTouches: number;
  lowTouches: number;
  firstDate: string;
  lastDate: string;
  lastBarIndex: number;
  /** 0–100 composite of touches + recency. */
  strength: number;
  relation: "above" | "below" | "inside";
}

export interface SupportResistanceResult {
  leftRight: number;
  atrPeriod: number;
  clusterAtrMult: number;
  zones: SrZone[];
}

export interface DetectSrOptions {
  leftRight?: number;
  atrPeriod?: number;
  clusterAtrMult?: number;
  minTouches?: number;
  maxZones?: number;
}

const DEFAULT_LEFT_RIGHT = 3;
const DEFAULT_ATR_PERIOD = 14;
const DEFAULT_CLUSTER_ATR = 0.4;
const DEFAULT_MIN_TOUCHES = 2;
const DEFAULT_MAX_ZONES = 8;

function trueRange(bars: OHLCVBar[], i: number): number {
  const bar = bars[i];
  const range = bar.high - bar.low;
  if (i === 0) return range;
  const prevClose = bars[i - 1].close;
  return Math.max(
    range,
    Math.abs(bar.high - prevClose),
    Math.abs(bar.low - prevClose),
  );
}

function atrLatest(bars: OHLCVBar[], period: number): number {
  const end = bars.length - 1;
  const start = Math.max(0, end - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    sum += trueRange(bars, i);
    count += 1;
  }
  return Math.max(count > 0 ? sum / count : bars[end].high - bars[end].low, 1e-9);
}

function isSwingHigh(bars: OHLCVBar[], idx: number, n: number): boolean {
  const h = bars[idx].high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].high >= h) return false;
  }
  return true;
}

function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  const l = bars[idx].low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].low <= l) return false;
  }
  return true;
}

type Pivot = {
  idx: number;
  date: string;
  price: number;
  kind: "high" | "low";
};

type Cluster = {
  prices: number[];
  kinds: Array<"high" | "low">;
  dates: string[];
  indices: number[];
};

function clusterPivots(pivots: Pivot[], tol: number): Cluster[] {
  if (!pivots.length) return [];
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: Cluster[] = [];

  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (!last) {
      clusters.push({
        prices: [p.price],
        kinds: [p.kind],
        dates: [p.date],
        indices: [p.idx],
      });
      continue;
    }
    const mid =
      last.prices.reduce((s, x) => s + x, 0) / last.prices.length;
    if (Math.abs(p.price - mid) <= tol || p.price - Math.max(...last.prices) <= tol) {
      last.prices.push(p.price);
      last.kinds.push(p.kind);
      last.dates.push(p.date);
      last.indices.push(p.idx);
    } else {
      clusters.push({
        prices: [p.price],
        kinds: [p.kind],
        dates: [p.date],
        indices: [p.idx],
      });
    }
  }

  // Merge neighbors whose mids remain within tolerance after expansion.
  const merged: Cluster[] = [];
  for (const c of clusters) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...c, prices: [...c.prices], kinds: [...c.kinds], dates: [...c.dates], indices: [...c.indices] });
      continue;
    }
    const prevMid = prev.prices.reduce((s, x) => s + x, 0) / prev.prices.length;
    const curMid = c.prices.reduce((s, x) => s + x, 0) / c.prices.length;
    if (Math.abs(curMid - prevMid) <= tol * 1.25) {
      prev.prices.push(...c.prices);
      prev.kinds.push(...c.kinds);
      prev.dates.push(...c.dates);
      prev.indices.push(...c.indices);
    } else {
      merged.push({
        prices: [...c.prices],
        kinds: [...c.kinds],
        dates: [...c.dates],
        indices: [...c.indices],
      });
    }
  }
  return merged;
}

function relationToPrice(
  low: number,
  high: number,
  price: number,
): "above" | "below" | "inside" {
  if (price < low) return "above"; // price below zone → zone acts as resistance above
  if (price > high) return "below"; // price above zone → zone acts as support below
  return "inside";
}

/**
 * Horizontal S/R as price *bands* clustered from fractal swing highs/lows.
 */
export function detectSupportResistance(
  bars: OHLCVBar[],
  options?: DetectSrOptions,
): SupportResistanceResult {
  requireNonEmptyArray(bars, "OHLCV bars for support/resistance");
  const leftRight = options?.leftRight ?? DEFAULT_LEFT_RIGHT;
  const atrPeriod = options?.atrPeriod ?? DEFAULT_ATR_PERIOD;
  const clusterAtrMult = options?.clusterAtrMult ?? DEFAULT_CLUSTER_ATR;
  const minTouches = options?.minTouches ?? DEFAULT_MIN_TOUCHES;
  const maxZones = options?.maxZones ?? DEFAULT_MAX_ZONES;

  const empty: SupportResistanceResult = {
    leftRight,
    atrPeriod,
    clusterAtrMult,
    zones: [],
  };

  const minLen = leftRight * 2 + 1;
  if (bars.length < minLen) return empty;

  const atr = atrLatest(bars, atrPeriod);
  const tol = atr * clusterAtrMult;
  const lastClose = bars[bars.length - 1].close;
  const lastIdx = bars.length - 1;

  const pivots: Pivot[] = [];
  for (let i = leftRight; i < bars.length - leftRight; i++) {
    if (isSwingHigh(bars, i, leftRight)) {
      pivots.push({
        idx: i,
        date: bars[i].date,
        price: bars[i].high,
        kind: "high",
      });
    }
    if (isSwingLow(bars, i, leftRight)) {
      pivots.push({
        idx: i,
        date: bars[i].date,
        price: bars[i].low,
        kind: "low",
      });
    }
  }

  const clusters = clusterPivots(pivots, tol);
  const zones: SrZone[] = [];

  for (const c of clusters) {
    const touches = c.prices.length;
    if (touches < minTouches) continue;

    let low = Math.min(...c.prices);
    let high = Math.max(...c.prices);
    let mid = c.prices.reduce((s, x) => s + x, 0) / c.prices.length;

    // Single tight cluster still rendered as a band, not a hairline.
    const minWidth = atr * 0.25;
    if (high - low < minWidth) {
      low = mid - minWidth / 2;
      high = mid + minWidth / 2;
    }

    const highTouches = c.kinds.filter((k) => k === "high").length;
    const lowTouches = c.kinds.filter((k) => k === "low").length;
    const lastBarIndex = Math.max(...c.indices);
    const firstDate = c.dates.reduce((a, b) => (a < b ? a : b));
    const lastDate = c.dates.reduce((a, b) => (a > b ? a : b));
    const recency = 1 - Math.min(1, (lastIdx - lastBarIndex) / Math.max(lastIdx, 1));
    const strength = Math.round(
      Math.min(100, touches * 18 + recency * 28 + (highTouches && lowTouches ? 8 : 0)),
    );

    const relation = relationToPrice(low, high, lastClose);
    // Prefer role from pivot mix; fall back to where price sits.
    let kind: SrZoneKind;
    if (highTouches >= lowTouches + 2) kind = "resistance";
    else if (lowTouches >= highTouches + 2) kind = "support";
    else if (relation === "below") kind = "support";
    else if (relation === "above") kind = "resistance";
    else kind = highTouches >= lowTouches ? "resistance" : "support";

    zones.push({
      id: `${kind}-${mid.toFixed(4)}-${touches}`,
      kind,
      low,
      high,
      mid,
      touches,
      highTouches,
      lowTouches,
      firstDate,
      lastDate,
      lastBarIndex,
      strength,
      relation,
    });
  }

  zones.sort((a, b) => b.strength - a.strength || b.touches - a.touches);
  return {
    leftRight,
    atrPeriod,
    clusterAtrMult,
    zones: zones.slice(0, maxZones),
  };
}

export function srZoneLabel(zone: SrZone): string {
  const role = zone.kind === "support" ? "지지" : "저항";
  return `${role} ${zone.low.toFixed(2)}–${zone.high.toFixed(2)}`;
}
