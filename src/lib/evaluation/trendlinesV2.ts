import type { OHLCVBar } from "../types";
import { requireNonEmptyArray } from "../require";
import type {
  Trendline,
  TrendlineKind,
  TrendlineResult,
  TrendlineTouch,
} from "./trendlines";

/**
 * V2 trendlines — trading-oriented quality over raw swing pairs.
 *
 * Improvements vs V1:
 * - Multi-scale fractal pivots (short + medium)
 * - Prefer HL / LH structural sequences
 * - Bounce quality (wick touch + close on correct side)
 * - Volume confirmation vs 20-bar average
 * - Containment between anchors (price stays on the right side)
 * - Strongly prefer intact lines near current price
 */

const SHORT_LR = 2;
const MED_LR = 5;
const ATR_PERIOD = 14;
const EPS_ATR = 0.28;
const MAX_GAP = 160;
const MAX_PER_SIDE = 3;
const VOL_LOOKBACK = 20;

type Pivot = { idx: number; date: string; price: number; scale: "short" | "med" };

function trueRange(bars: OHLCVBar[], i: number): number {
  const bar = bars[i]!;
  const range = bar.high - bar.low;
  if (i === 0) return range;
  const prevClose = bars[i - 1]!.close;
  return Math.max(
    range,
    Math.abs(bar.high - prevClose),
    Math.abs(bar.low - prevClose),
  );
}

function atrSeries(bars: OHLCVBar[], period: number): number[] {
  const out = new Array<number>(bars.length).fill(0);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const tr = trueRange(bars, i);
    sum += tr;
    if (i >= period) sum -= trueRange(bars, i - period);
    const n = Math.min(i + 1, period);
    out[i] = Math.max(sum / n, 1e-9);
  }
  return out;
}

function isSwingHigh(bars: OHLCVBar[], idx: number, n: number): boolean {
  const h = bars[idx]!.high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i]!.high >= h) return false;
  }
  return true;
}

function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  const l = bars[idx]!.low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i]!.low <= l) return false;
  }
  return true;
}

function collectPivots(
  bars: OHLCVBar[],
  kind: "low" | "high",
): Pivot[] {
  const byIdx = new Map<number, Pivot>();
  for (const [n, scale] of [
    [SHORT_LR, "short"],
    [MED_LR, "med"],
  ] as const) {
    for (let i = n; i < bars.length - n; i++) {
      const ok =
        kind === "low" ? isSwingLow(bars, i, n) : isSwingHigh(bars, i, n);
      if (!ok) continue;
      const price = kind === "low" ? bars[i]!.low : bars[i]!.high;
      const prev = byIdx.get(i);
      // Prefer medium-scale label when both fire on same bar.
      if (!prev || scale === "med") {
        byIdx.set(i, {
          idx: i,
          date: bars[i]!.date,
          price,
          scale,
        });
      }
    }
  }
  return [...byIdx.values()].sort((a, b) => a.idx - b.idx);
}

function linePrice(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): number {
  if (x2 === x1) return y1;
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}

function volumeSma(bars: OHLCVBar[], i: number, period: number): number {
  const start = Math.max(0, i - period + 1);
  let sum = 0;
  let n = 0;
  for (let j = start; j <= i; j++) {
    sum += bars[j]!.volume;
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

function scoreV2Candidate(args: {
  kind: TrendlineKind;
  bars: OHLCVBar[];
  a: Pivot;
  b: Pivot;
  atrAtB: number;
  eps: number;
  endIdx: number;
}): Trendline | null {
  const { kind, bars, a, b, atrAtB, eps, endIdx } = args;
  const slope = (b.price - a.price) / Math.max(1, b.idx - a.idx);

  if (kind === "ascending" && !(b.price > a.price)) return null;
  if (kind === "descending" && !(b.price < a.price)) return null;
  if (Math.abs(slope) > atrAtB * 1.2) return null;

  // Structural: ascending wants HL, descending wants LH (already slope-checked).
  // Prefer medium-scale anchors.
  const scaleBonus =
    (a.scale === "med" ? 8 : 0) + (b.scale === "med" ? 8 : 0);

  const touchPoints: TrendlineTouch[] = [];
  let bounceTouches = 0;
  let volumeTouches = 0;
  let sideViolations = 0;
  let sideChecks = 0;
  let broken = false;
  let breakBarIndex: number | null = null;

  for (let i = a.idx; i <= endIdx; i++) {
    const expected = linePrice(a.idx, a.price, b.idx, b.price, i);
    const bar = bars[i]!;
    const volAvg = volumeSma(bars, i, VOL_LOOKBACK);
    const volOk = volAvg > 0 && bar.volume >= volAvg * 1.05;

    if (kind === "ascending") {
      if (i >= a.idx && i <= b.idx) {
        sideChecks += 1;
        if (bar.close < expected - eps) sideViolations += 1;
      }
      const wickDist = Math.abs(bar.low - expected);
      const touched = wickDist <= eps;
      const bounce =
        touched && bar.close >= expected - eps * 0.25 && bar.open >= expected - eps;
      if (touched) {
        touchPoints.push({
          barIndex: i,
          date: bar.date,
          price: bar.low,
          distance: wickDist,
        });
        if (bounce) bounceTouches += 1;
        if (volOk && bounce) volumeTouches += 1;
      }
      if (i > b.idx && bar.close < expected - eps * 1.75) {
        broken = true;
        breakBarIndex = i;
        break;
      }
    } else {
      if (i >= a.idx && i <= b.idx) {
        sideChecks += 1;
        if (bar.close > expected + eps) sideViolations += 1;
      }
      const wickDist = Math.abs(bar.high - expected);
      const touched = wickDist <= eps;
      const bounce =
        touched && bar.close <= expected + eps * 0.25 && bar.open <= expected + eps;
      if (touched) {
        touchPoints.push({
          barIndex: i,
          date: bar.date,
          price: bar.high,
          distance: wickDist,
        });
        if (bounce) bounceTouches += 1;
        if (volOk && bounce) volumeTouches += 1;
      }
      if (i > b.idx && bar.close > expected + eps * 1.75) {
        broken = true;
        breakBarIndex = i;
        break;
      }
    }
  }

  const touches = touchPoints.length;
  if (touches < 2) return null;

  const extraTouches = Math.max(0, touches - 2);
  // Soft-require a third interaction (bounce) for quality — allow rare 2-touch if long span + intact.
  const spanBars = b.idx - a.idx;
  if (extraTouches < 1 && !(spanBars >= 40 && !broken && bounceTouches >= 2)) {
    return null;
  }
  if (bounceTouches < 2) return null;

  const containment =
    sideChecks > 0 ? 1 - sideViolations / sideChecks : 0;
  if (containment < 0.72) return null;

  const yAtEnd = linePrice(a.idx, a.price, b.idx, b.price, endIdx);
  const last = bars[endIdx]!;
  const lastMid = (last.high + last.low) / 2;
  const distNow = Math.abs(lastMid - yAtEnd);
  const proximity = Math.max(0, 1 - distNow / (atrAtB * 8));

  let score = Math.round(
    Math.min(28, bounceTouches * 9) +
      Math.min(18, volumeTouches * 7) +
      Math.min(18, spanBars / 4) +
      Math.min(16, containment * 16) +
      Math.min(12, proximity * 12) +
      scaleBonus +
      (broken ? 0 : 22),
  );
  const recency = 1 - Math.min(1, (endIdx - b.idx) / Math.max(endIdx, 1));
  score = Math.round(score + recency * 12);
  if (broken) score = Math.min(score, 48);

  const kindKo = kind === "ascending" ? "상승 추세선" : "하락 추세선";
  const summary = `${kindKo} V2 · 반등 ${bounceTouches} · 거래량 ${volumeTouches} · 점수 ${score}${
    broken ? " · 이탈" : ""
  }`;

  return {
    id: `v2-${kind}-${a.idx}-${b.idx}-${a.price.toFixed(2)}`,
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

function pickTop(lines: Trendline[], max: number): Trendline[] {
  const intact = lines.filter((l) => !l.broken);
  const broken = lines.filter((l) => l.broken);
  const rank = (arr: Trendline[]) =>
    [...arr].sort(
      (a, b) =>
        b.score - a.score || b.touches - a.touches || b.spanBars - a.spanBars,
    );

  const picked: Trendline[] = [];
  const tryAdd = (line: Trendline) => {
    if (picked.length >= max) return;
    const midY = (line.y1 + line.y2) / 2;
    const dup = picked.some((p) => {
      const pMid = (p.y1 + p.y2) / 2;
      const slopeClose =
        Math.abs(p.slopePerBar - line.slopePerBar) <
        Math.abs(line.slopePerBar) * 0.22 + 1e-9;
      const levelClose =
        Math.abs(pMid - midY) / Math.max(Math.abs(midY), 1e-9) < 0.018;
      return slopeClose && levelClose;
    });
    if (!dup) picked.push(line);
  };

  for (const line of rank(intact)) tryAdd(line);
  // Only fill with broken if we still have slots (show recent breaks).
  for (const line of rank(broken)) tryAdd(line);
  return picked;
}

export function detectTrendlinesV2(bars: OHLCVBar[]): TrendlineResult {
  requireNonEmptyArray(bars, "OHLCV bars for trendlines v2");
  const empty: TrendlineResult = {
    version: "v2",
    leftRight: MED_LR,
    atrPeriod: ATR_PERIOD,
    epsilonAtrMult: EPS_ATR,
    ascending: [],
    descending: [],
  };

  if (bars.length < MED_LR * 2 + 8) return empty;

  const atrs = atrSeries(bars, ATR_PERIOD);
  const endIdx = bars.length - 1;
  const atr = atrs[endIdx]!;
  const lastMid = (bars[endIdx]!.high + bars[endIdx]!.low) / 2;
  const eps = Math.max(atr * EPS_ATR, lastMid * 0.0035);

  const lows = collectPivots(bars, "low");
  const highs = collectPivots(bars, "high");

  const ascendingRaw: Trendline[] = [];
  for (let i = 0; i < lows.length; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const a = lows[i]!;
      const b = lows[j]!;
      if (b.idx - a.idx > MAX_GAP) continue;
      if (b.idx - a.idx < SHORT_LR * 3) continue;
      const line = scoreV2Candidate({
        kind: "ascending",
        bars,
        a,
        b,
        atrAtB: atrs[b.idx]!,
        eps,
        endIdx,
      });
      if (line) ascendingRaw.push(line);
    }
  }

  const descendingRaw: Trendline[] = [];
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const a = highs[i]!;
      const b = highs[j]!;
      if (b.idx - a.idx > MAX_GAP) continue;
      if (b.idx - a.idx < SHORT_LR * 3) continue;
      const line = scoreV2Candidate({
        kind: "descending",
        bars,
        a,
        b,
        atrAtB: atrs[b.idx]!,
        eps,
        endIdx,
      });
      if (line) descendingRaw.push(line);
    }
  }

  return {
    version: "v2",
    leftRight: MED_LR,
    atrPeriod: ATR_PERIOD,
    epsilonAtrMult: EPS_ATR,
    ascending: pickTop(ascendingRaw, MAX_PER_SIDE),
    descending: pickTop(descendingRaw, MAX_PER_SIDE),
  };
}
