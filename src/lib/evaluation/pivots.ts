import type { OHLCVBar } from "../types";

export interface Pivot {
  idx: number;
  date: string;
  price: number;
  kind: "high" | "low";
}

export function isSwingHigh(
  bars: OHLCVBar[],
  idx: number,
  n: number,
): boolean {
  if (idx < n || idx + n >= bars.length) return false;
  const h = bars[idx].high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].high >= h) return false;
  }
  return true;
}

export function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  if (idx < n || idx + n >= bars.length) return false;
  const l = bars[idx].low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].low <= l) return false;
  }
  return true;
}

export function collectSwingPivots(
  bars: OHLCVBar[],
  leftRight = 3,
): Pivot[] {
  const out: Pivot[] = [];
  for (let i = leftRight; i < bars.length - leftRight; i++) {
    const high = isSwingHigh(bars, i, leftRight);
    const low = isSwingLow(bars, i, leftRight);
    if (high) {
      out.push({
        idx: i,
        date: bars[i].date,
        price: bars[i].high,
        kind: "high",
      });
    }
    if (low) {
      out.push({
        idx: i,
        date: bars[i].date,
        price: bars[i].low,
        kind: "low",
      });
    }
  }
  return out.sort((a, b) => a.idx - b.idx);
}

/** Simple rolling ATR at each bar (Wilder-ish SMA of TR). */
export function computeAtrSeries(
  bars: OHLCVBar[],
  period = 14,
): Array<number | null> {
  const out: Array<number | null> = bars.map(() => null);
  if (bars.length < period + 1) return out;

  const tr: number[] = [bars[0].high - bars[0].low];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    const b = bars[i];
    tr.push(
      Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev)),
    );
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  out[period - 1] = sum / period;
  for (let i = period; i < bars.length; i++) {
    const prev = out[i - 1] ?? sum / period;
    out[i] = (prev * (period - 1) + tr[i]) / period;
  }
  return out;
}

export function atrAt(
  atr: Array<number | null>,
  idx: number,
  fallback: number,
): number {
  for (let i = idx; i >= 0; i--) {
    const v = atr[i];
    if (v != null && v > 0) return v;
  }
  return Math.max(fallback, 1e-9);
}

export function nearEqual(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

export function linePrice(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): number {
  if (x2 === x1) return y1;
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

/** Least-squares slope through (idx, price) points. */
export function fitSlope(points: Array<{ idx: number; price: number }>): {
  slope: number;
  intercept: number;
} | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sx += p.idx;
    sy += p.price;
    sxx += p.idx * p.idx;
    sxy += p.idx * p.price;
  }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-12) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export function priceOnFit(
  fit: { slope: number; intercept: number },
  idx: number,
): number {
  return fit.intercept + fit.slope * idx;
}
