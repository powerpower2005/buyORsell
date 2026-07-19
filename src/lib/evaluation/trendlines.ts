import type { OHLCVBar } from "../types";
import { requireNonEmptyArray } from "../require";

export type TrendlineKind = "ascending" | "descending";

export interface TrendlineTouch {
  barIndex: number;
  date: string;
  price: number;
  distance: number;
}

export interface Trendline {
  id: string;
  kind: TrendlineKind;
  /** Anchor A (earlier). */
  x1: number;
  y1: number;
  date1: string;
  /** Anchor B (later). */
  x2: number;
  y2: number;
  date2: string;
  /** Price at last bar (extended). */
  yAtEnd: number;
  endBarIndex: number;
  slopePerBar: number;
  touches: number;
  touchPoints: TrendlineTouch[];
  spanBars: number;
  broken: boolean;
  breakBarIndex: number | null;
  score: number;
  summary: string;
}

export type TrendlineAlgoVersion = "v1" | "v2";

export interface TrendlineResult {
  version: TrendlineAlgoVersion;
  leftRight: number;
  atrPeriod: number;
  epsilonAtrMult: number;
  ascending: Trendline[];
  descending: Trendline[];
}

export interface DetectTrendlineOptions {
  leftRight?: number;
  atrPeriod?: number;
  epsilonAtrMult?: number;
  minExtraTouches?: number;
  maxPerSide?: number;
  maxAnchorGapBars?: number;
}

const DEFAULT_LEFT_RIGHT = 3;
const DEFAULT_ATR = 14;
const DEFAULT_EPS_ATR = 0.3;
const DEFAULT_MIN_EXTRA = 1; // anchors + at least 1 more touch preferred; score still works with 0
const DEFAULT_MAX_PER_SIDE = 2;
const DEFAULT_MAX_GAP = 180;

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

type Pivot = { idx: number; date: string; price: number };

function linePrice(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x2 === x1) return y1;
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

function scoreTrendlineCandidate(args: {
  kind: TrendlineKind;
  bars: OHLCVBar[];
  a: Pivot;
  b: Pivot;
  atr: number;
  eps: number;
  endIdx: number;
}): Trendline | null {
  const { kind, bars, a, b, atr, eps, endIdx } = args;
  const slope = (b.price - a.price) / Math.max(1, b.idx - a.idx);

  // Ascending support: rising lows. Descending resistance: falling highs.
  if (kind === "ascending" && slope <= 0) return null;
  if (kind === "descending" && slope >= 0) return null;

  // Reject absurdly steep lines (more than ~1.5 ATR per bar).
  if (Math.abs(slope) > atr * 1.5) return null;

  const touchPoints: TrendlineTouch[] = [];
  let broken = false;
  let breakBarIndex: number | null = null;

  // Score touches from first anchor to end (or break).
  for (let i = a.idx; i <= endIdx; i++) {
    const expected = linePrice(a.idx, a.price, b.idx, b.price, i);
    const bar = bars[i];

    if (kind === "ascending") {
      const dist = Math.abs(bar.low - expected);
      if (dist <= eps) {
        touchPoints.push({
          barIndex: i,
          date: bar.date,
          price: bar.low,
          distance: dist,
        });
      }
      // Hard break: close clearly below the line after the second anchor.
      if (i > b.idx && bar.close < expected - eps * 1.5) {
        broken = true;
        breakBarIndex = i;
        break;
      }
    } else {
      const dist = Math.abs(bar.high - expected);
      if (dist <= eps) {
        touchPoints.push({
          barIndex: i,
          date: bar.date,
          price: bar.high,
          distance: dist,
        });
      }
      if (i > b.idx && bar.close > expected + eps * 1.5) {
        broken = true;
        breakBarIndex = i;
        break;
      }
    }
  }

  // Deduplicate near-consecutive touches into events-ish count: keep unique indices.
  const touches = touchPoints.length;
  if (touches < 2) return null; // need both anchors at least; they should register

  const spanBars = b.idx - a.idx;
  const extraTouches = Math.max(0, touches - 2);
  if (extraTouches < 0) return null;

  // Prefer lines with more touches, longer span, still intact.
  let score = Math.round(
    Math.min(40, extraTouches * 14) +
      Math.min(30, spanBars / 3) +
      Math.min(20, touches * 4) +
      (broken ? 0 : 25),
  );
  // Slight boost when second anchor is relatively recent.
  const recency = 1 - Math.min(1, (endIdx - b.idx) / Math.max(endIdx, 1));
  score = Math.round(score + recency * 15);
  if (broken) score = Math.min(score, 55);

  const yAtEnd = linePrice(a.idx, a.price, b.idx, b.price, endIdx);
  const kindKo = kind === "ascending" ? "상승 추세선" : "하락 추세선";
  const summary = `${kindKo} · 터치 ${touches} · 점수 ${score}${
    broken ? " · 이탈" : ""
  }`;

  return {
    id: `${kind}-${a.idx}-${b.idx}-${a.price.toFixed(2)}`,
    kind,
    x1: a.idx,
    y1: a.price,
    date1: a.date,
    x2: b.idx,
    y2: b.price,
    date2: b.date,
    yAtEnd,
    endBarIndex: broken && breakBarIndex != null ? breakBarIndex : endIdx,
    slopePerBar: slope,
    touches,
    touchPoints,
    spanBars,
    broken,
    breakBarIndex,
    score,
    summary,
  };
}

function pickTopNonOverlapping(
  lines: Trendline[],
  max: number,
): Trendline[] {
  const sorted = [...lines].sort(
    (a, b) => b.score - a.score || b.touches - a.touches || b.spanBars - a.spanBars,
  );
  const picked: Trendline[] = [];
  for (const line of sorted) {
    if (picked.length >= max) break;
    // Skip near-duplicates (similar slope and mid price).
    const midY = (line.y1 + line.y2) / 2;
    const dup = picked.some((p) => {
      const pMid = (p.y1 + p.y2) / 2;
      const slopeClose =
        Math.abs(p.slopePerBar - line.slopePerBar) <
        Math.abs(line.slopePerBar) * 0.25 + 1e-9;
      const levelClose = Math.abs(pMid - midY) / Math.max(Math.abs(midY), 1e-9) < 0.02;
      return slopeClose && levelClose;
    });
    if (!dup) picked.push(line);
  }
  return picked;
}

/**
 * Dynamic trendlines from fractal swing anchors, ranked by touches / span / intactness.
 */
export function detectTrendlines(
  bars: OHLCVBar[],
  options?: DetectTrendlineOptions,
): TrendlineResult {
  requireNonEmptyArray(bars, "OHLCV bars for trendlines");
  const leftRight = options?.leftRight ?? DEFAULT_LEFT_RIGHT;
  const atrPeriod = options?.atrPeriod ?? DEFAULT_ATR;
  const epsilonAtrMult = options?.epsilonAtrMult ?? DEFAULT_EPS_ATR;
  const minExtra = options?.minExtraTouches ?? DEFAULT_MIN_EXTRA;
  const maxPerSide = options?.maxPerSide ?? DEFAULT_MAX_PER_SIDE;
  const maxGap = options?.maxAnchorGapBars ?? DEFAULT_MAX_GAP;

  const empty: TrendlineResult = {
    version: "v1",
    leftRight,
    atrPeriod,
    epsilonAtrMult,
    ascending: [],
    descending: [],
  };

  const minLen = leftRight * 2 + 1;
  if (bars.length < minLen) return empty;

  const atr = atrLatest(bars, atrPeriod);
  const lastMid = (bars[bars.length - 1].high + bars[bars.length - 1].low) / 2;
  const eps = Math.max(atr * epsilonAtrMult, lastMid * 0.004);
  const endIdx = bars.length - 1;

  const lows: Pivot[] = [];
  const highs: Pivot[] = [];
  for (let i = leftRight; i < bars.length - leftRight; i++) {
    if (isSwingLow(bars, i, leftRight)) {
      lows.push({ idx: i, date: bars[i].date, price: bars[i].low });
    }
    if (isSwingHigh(bars, i, leftRight)) {
      highs.push({ idx: i, date: bars[i].date, price: bars[i].high });
    }
  }

  const ascendingRaw: Trendline[] = [];
  for (let i = 0; i < lows.length; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const a = lows[i];
      const b = lows[j];
      if (b.idx - a.idx > maxGap) continue;
      if (b.idx - a.idx < leftRight * 2) continue;
      const line = scoreTrendlineCandidate({
        kind: "ascending",
        bars,
        a,
        b,
        atr,
        eps,
        endIdx,
      });
      if (!line) continue;
      if (line.touches - 2 < minExtra && line.score < 50) continue;
      ascendingRaw.push(line);
    }
  }

  const descendingRaw: Trendline[] = [];
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const a = highs[i];
      const b = highs[j];
      if (b.idx - a.idx > maxGap) continue;
      if (b.idx - a.idx < leftRight * 2) continue;
      const line = scoreTrendlineCandidate({
        kind: "descending",
        bars,
        a,
        b,
        atr,
        eps,
        endIdx,
      });
      if (!line) continue;
      if (line.touches - 2 < minExtra && line.score < 50) continue;
      descendingRaw.push(line);
    }
  }

  return {
    version: "v1",
    leftRight,
    atrPeriod,
    epsilonAtrMult,
    ascending: pickTopNonOverlapping(ascendingRaw, maxPerSide),
    descending: pickTopNonOverlapping(descendingRaw, maxPerSide),
  };
}

export function trendlinePriceAt(
  line: Trendline,
  barIndex: number,
): number {
  return linePrice(line.x1, line.y1, line.x2, line.y2, barIndex);
}
