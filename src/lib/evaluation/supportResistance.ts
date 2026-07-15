import type { OHLCVBar, Timeframe } from "../types";
import { requireNonEmptyArray } from "../require";

export type SrZoneKind = "support" | "resistance";
export type QualityGrade = "A" | "B" | "C" | "D" | "—";
export type TouchBand = "sparse" | "ideal" | "busy" | "overtouched" | "unknown";
export type BounceBand = "weak" | "adequate" | "strong" | "unknown";
export type VolumeBand = "light" | "normal" | "heavy" | "unknown";
export type DurationBand = "fresh" | "seasoned" | "mature" | "unknown";

export interface SrZoneQuality {
  grade: QualityGrade;
  score: number;
  /** Bars whose wick/body intersects the zone. */
  candleTouches: number;
  /** Merged consecutive touch runs (touch events). */
  touchEvents: number;
  touchBand: TouchBand;
  /** Mean rebound/rejection distance after touch, in ATR. */
  avgBounceAtr: number | null;
  bounceBand: BounceBand;
  /** Mean touch-event volume vs 20-bar baseline before the event. */
  avgVolumeRatio: number | null;
  volumeBand: VolumeBand;
  /** Bars from first to last candle touch. */
  spanBars: number;
  /** Bars from first candle touch to latest bar. */
  ageBars: number;
  durationBand: DurationBand;
  /** Price has closed through the zone. */
  broken: boolean;
  /** Too many touches → break risk. */
  overtouchCaution: boolean;
  summary: string;
  caution: string | null;
}

export interface SrZone {
  id: string;
  kind: SrZoneKind;
  low: number;
  high: number;
  mid: number;
  /** Swing-pivot samples inside the cluster (legacy touch estimate). */
  pivotTouches: number;
  highTouches: number;
  lowTouches: number;
  firstDate: string;
  lastDate: string;
  lastBarIndex: number;
  relation: "above" | "below" | "inside";
  quality: SrZoneQuality;
  /** @deprecated use quality.score — kept for sort/legend compatibility */
  strength: number;
  /** @deprecated use quality.candleTouches */
  touches: number;
}

export interface SupportResistanceResult {
  leftRight: number;
  atrPeriod: number;
  /** @deprecated Prefer maxZonePct; kept for older UI text. */
  clusterAtrMult: number;
  /** Max half-width of a zone as a fraction of mid (0.02 = ±2%). */
  maxZonePct: number;
  zones: SrZone[];
}

export interface DetectSrOptions {
  leftRight?: number;
  atrPeriod?: number;
  clusterAtrMult?: number;
  /** Cap zone to mid ± this fraction. Defaults by timeframe (1d → ±2%). */
  maxZonePct?: number;
  timeframe?: Timeframe;
  minTouches?: number;
  maxZones?: number;
}

const DEFAULT_LEFT_RIGHT = 3;
const DEFAULT_ATR_PERIOD = 14;
/** How much of ATR is used as the "typical noise" half-width before % cap. */
const DEFAULT_CLUSTER_ATR = 0.35;
/** Daily default: zone half-width capped at ±2% of mid. */
const DEFAULT_MAX_ZONE_PCT = 0.02;
/** Hairline floors at ±0.4% so a band is still visible. */
const MIN_ZONE_HALF_PCT = 0.004;
const DEFAULT_MIN_TOUCHES = 2;
const DEFAULT_MAX_ZONES = 8;
const VOLUME_BASELINE = 20;
const BOUNCE_LOOKAHEAD = 8;

/** Ideal candle-touch sweet spot; beyond this overtouch caution rises. */
const TOUCH_IDEAL_MIN = 2;
const TOUCH_IDEAL_MAX = 4;
const TOUCH_BUSY_MAX = 7;

/** Hard % cap by timeframe so a "zone" stays a tight band. */
export function defaultMaxZonePct(timeframe?: Timeframe): number {
  if (timeframe === "1w") return 0.035;
  if (timeframe === "4h" || timeframe === "1h" || timeframe === "15m") {
    return 0.015;
  }
  return DEFAULT_MAX_ZONE_PCT; // 1d → ±2%
}

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

function clusterPivots(
  pivots: Pivot[],
  atrTol: number,
  maxHalfPct: number,
): Cluster[] {
  if (!pivots.length) return [];
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: Cluster[] = [];

  const wouldFit = (prices: number[], next: number): boolean => {
    const all = [...prices, next];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const mid = all.reduce((s, x) => s + x, 0) / all.length;
    const maxSpan = 2 * mid * maxHalfPct;
    if (hi - lo > maxSpan + 1e-9) return false;
    const tol = Math.min(atrTol, mid * maxHalfPct);
    const curMid = prices.reduce((s, x) => s + x, 0) / prices.length;
    return Math.abs(next - curMid) <= tol || next - Math.max(...prices) <= tol;
  };

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
    if (wouldFit(last.prices, p.price)) {
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

  const merged: Cluster[] = [];
  for (const c of clusters) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({
        prices: [...c.prices],
        kinds: [...c.kinds],
        dates: [...c.dates],
        indices: [...c.indices],
      });
      continue;
    }
    const combined = [...prev.prices, ...c.prices];
    const lo = Math.min(...combined);
    const hi = Math.max(...combined);
    const mid = combined.reduce((s, x) => s + x, 0) / combined.length;
    const maxSpan = 2 * mid * maxHalfPct;
    const prevMid = prev.prices.reduce((s, x) => s + x, 0) / prev.prices.length;
    const curMid = c.prices.reduce((s, x) => s + x, 0) / c.prices.length;
    const mergeTol = Math.min(atrTol, mid * maxHalfPct) * 1.25;
    if (hi - lo <= maxSpan + 1e-9 && Math.abs(curMid - prevMid) <= mergeTol) {
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

/** Clamp band to mid ± maxHalfPct; keep tighter natural width when possible. */
function clampZoneWidth(
  rawLow: number,
  rawHigh: number,
  mid: number,
  maxHalfPct: number,
): { low: number; high: number } {
  const maxHalf = mid * maxHalfPct;
  const minHalf = mid * MIN_ZONE_HALF_PCT;
  let low = Math.max(rawLow, mid - maxHalf);
  let high = Math.min(rawHigh, mid + maxHalf);
  if (high < low) {
    low = mid - maxHalf;
    high = mid + maxHalf;
  }
  if (high - low < 2 * minHalf) {
    low = mid - minHalf;
    high = mid + minHalf;
  }
  return { low, high };
}

function relationToPrice(
  low: number,
  high: number,
  price: number,
): "above" | "below" | "inside" {
  if (price < low) return "above";
  if (price > high) return "below";
  return "inside";
}

function barTouchesZone(bar: OHLCVBar, low: number, high: number): boolean {
  return bar.low <= high && bar.high >= low;
}

function meanVolume(bars: OHLCVBar[], from: number, to: number): number {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(bars.length - 1, Math.max(from, to));
  if (b < a) return 0;
  let sum = 0;
  for (let i = a; i <= b; i++) sum += bars[i].volume;
  return sum / (b - a + 1);
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

function touchBandFor(count: number): TouchBand {
  if (count <= 0) return "unknown";
  if (count < TOUCH_IDEAL_MIN) return "sparse";
  if (count <= TOUCH_IDEAL_MAX) return "ideal";
  if (count <= TOUCH_BUSY_MAX) return "busy";
  return "overtouched";
}

function bounceBandFor(atrMove: number | null): BounceBand {
  if (atrMove == null || !Number.isFinite(atrMove)) return "unknown";
  if (atrMove < 0.45) return "weak";
  if (atrMove < 1.0) return "adequate";
  return "strong";
}

function volumeBandFor(ratio: number | null): VolumeBand {
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return "unknown";
  if (ratio < 0.8) return "light";
  if (ratio > 1.5) return "heavy";
  return "normal";
}

function durationBandFor(spanBars: number): DurationBand {
  if (spanBars <= 0) return "unknown";
  if (spanBars < 20) return "fresh";
  if (spanBars < 60) return "seasoned";
  return "mature";
}

function scoreTouchBand(band: TouchBand): number {
  if (band === "ideal") return 100;
  if (band === "busy") return 62;
  if (band === "sparse") return 40;
  if (band === "overtouched") return 28;
  return 50;
}

function scoreBounceBand(band: BounceBand): number {
  if (band === "strong") return 95;
  if (band === "adequate") return 78;
  if (band === "weak") return 35;
  return 50;
}

function scoreVolumeBand(band: VolumeBand): number {
  if (band === "heavy") return 92;
  if (band === "normal") return 72;
  if (band === "light") return 38;
  return 50;
}

function scoreDurationBand(band: DurationBand): number {
  if (band === "mature") return 95;
  if (band === "seasoned") return 78;
  if (band === "fresh") return 48;
  return 50;
}

function analyzeZoneQuality(
  bars: OHLCVBar[],
  kind: SrZoneKind,
  low: number,
  high: number,
  mid: number,
  atr: number,
): SrZoneQuality {
  const touchIndices: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (barTouchesZone(bars[i], low, high)) touchIndices.push(i);
  }

  const candleTouches = touchIndices.length;
  type Event = { start: number; end: number };
  const events: Event[] = [];
  for (const idx of touchIndices) {
    const last = events[events.length - 1];
    if (last && idx <= last.end + 1) {
      last.end = idx;
    } else {
      events.push({ start: idx, end: idx });
    }
  }

  const bounceMoves: number[] = [];
  const volumeRatios: number[] = [];

  for (const ev of events) {
    const lookEnd = Math.min(bars.length - 1, ev.end + BOUNCE_LOOKAHEAD);
    if (kind === "support") {
      let peak = bars[ev.end].high;
      for (let i = ev.end; i <= lookEnd; i++) {
        peak = Math.max(peak, bars[i].high);
      }
      bounceMoves.push(Math.max(0, (peak - mid) / atr));
    } else {
      let trough = bars[ev.end].low;
      for (let i = ev.end; i <= lookEnd; i++) {
        trough = Math.min(trough, bars[i].low);
      }
      bounceMoves.push(Math.max(0, (mid - trough) / atr));
    }

    const touchVol = meanVolume(bars, ev.start, ev.end);
    const baseTo = Math.max(0, ev.start - 1);
    const baseFrom = Math.max(0, baseTo - VOLUME_BASELINE + 1);
    const baseVol =
      baseTo >= baseFrom ? meanVolume(bars, baseFrom, baseTo) : touchVol;
    if (baseVol > 0) volumeRatios.push(touchVol / baseVol);
  }

  const avgBounceAtr =
    bounceMoves.length > 0
      ? bounceMoves.reduce((s, x) => s + x, 0) / bounceMoves.length
      : null;
  const avgVolumeRatio =
    volumeRatios.length > 0
      ? volumeRatios.reduce((s, x) => s + x, 0) / volumeRatios.length
      : null;

  const firstTouch = touchIndices[0] ?? 0;
  const lastTouch = touchIndices[touchIndices.length - 1] ?? 0;
  const spanBars =
    candleTouches > 0 ? Math.max(1, lastTouch - firstTouch + 1) : 0;
  const ageBars =
    candleTouches > 0 ? Math.max(1, bars.length - 1 - firstTouch) : 0;

  const pierceTol = atr * 0.25;
  let broken = false;
  if (candleTouches > 0) {
    for (let i = lastTouch; i < bars.length; i++) {
      if (kind === "support" && bars[i].close < low - pierceTol) {
        broken = true;
        break;
      }
      if (kind === "resistance" && bars[i].close > high + pierceTol) {
        broken = true;
        break;
      }
    }
  }

  const touchBand = touchBandFor(events.length || candleTouches);
  const bounceBand = bounceBandFor(avgBounceAtr);
  const volumeBand = volumeBandFor(avgVolumeRatio);
  const durationBand = durationBandFor(spanBars);
  const overtouchCaution = touchBand === "overtouched" || touchBand === "busy";

  let score = Math.round(
    0.3 * scoreTouchBand(touchBand) +
      0.3 * scoreBounceBand(bounceBand) +
      0.2 * scoreVolumeBand(volumeBand) +
      0.2 * scoreDurationBand(durationBand),
  );
  if (broken) score = Math.min(score, 35);
  if (touchBand === "overtouched") score = Math.min(score, 50);

  const grade = gradeFromScore(score);

  const touchKo =
    touchBand === "ideal"
      ? `터치 ${events.length}회(적정)`
      : touchBand === "busy"
        ? `터치 ${events.length}회(많음)`
        : touchBand === "overtouched"
          ? `터치 ${events.length}회(과다)`
          : touchBand === "sparse"
            ? `터치 ${events.length}회(적음)`
            : "터치 미정";
  const bounceKo =
    bounceBand === "strong"
      ? "반등/거부 큼"
      : bounceBand === "adequate"
        ? "반등/거부 충분"
        : bounceBand === "weak"
          ? "반등/거부 약함"
          : "반등 미정";
  const volKo =
    volumeBand === "heavy"
      ? "거래량 풍부"
      : volumeBand === "normal"
        ? "거래량 보통"
        : volumeBand === "light"
          ? "거래량 빈약"
          : "거래량 미정";
  const durKo =
    durationBand === "mature"
      ? `유지 ${spanBars}봉(장기)`
      : durationBand === "seasoned"
        ? `유지 ${spanBars}봉`
        : durationBand === "fresh"
          ? `유지 ${spanBars}봉(짧음)`
          : "유지 미정";

  const summary = `품질 ${grade} · ${touchKo} · ${bounceKo} · ${volKo} · ${durKo}`;
  const cautions: string[] = [];
  if (broken) {
    cautions.push(
      kind === "support"
        ? "종가가 지지대 아래로 이탈했습니다."
        : "종가가 저항대 위로 돌파했습니다.",
    );
  }
  if (touchBand === "overtouched") {
    cautions.push(
      "캔들 터치가 너무 많아 존이 약해지거나 뚫릴 위험이 큽니다.",
    );
  } else if (touchBand === "busy") {
    cautions.push("터치가 잦습니다. 이후 돌파 가능성을 함께 보세요.");
  }
  if (bounceBand === "weak" && !broken) {
    cautions.push("터치 후 반등/거부 폭이 작아 힘이 약한 편입니다.");
  }
  if (volumeBand === "light" && !broken) {
    cautions.push("터치 시 거래량이 빈약합니다.");
  }

  return {
    grade,
    score,
    candleTouches,
    touchEvents: events.length,
    touchBand,
    avgBounceAtr,
    bounceBand,
    avgVolumeRatio,
    volumeBand,
    spanBars,
    ageBars,
    durationBand,
    broken,
    overtouchCaution,
    summary,
    caution: cautions.length ? cautions.join(" ") : null,
  };
}

/**
 * Horizontal S/R as price *bands* clustered from fractal swing highs/lows,
 * then scored by candle touches, bounce width, volume, and lifetime.
 */
export function detectSupportResistance(
  bars: OHLCVBar[],
  options?: DetectSrOptions,
): SupportResistanceResult {
  requireNonEmptyArray(bars, "OHLCV bars for support/resistance");
  const leftRight = options?.leftRight ?? DEFAULT_LEFT_RIGHT;
  const atrPeriod = options?.atrPeriod ?? DEFAULT_ATR_PERIOD;
  const clusterAtrMult = options?.clusterAtrMult ?? DEFAULT_CLUSTER_ATR;
  const maxZonePct =
    options?.maxZonePct ?? defaultMaxZonePct(options?.timeframe);
  const minTouches = options?.minTouches ?? DEFAULT_MIN_TOUCHES;
  const maxZones = options?.maxZones ?? DEFAULT_MAX_ZONES;

  const empty: SupportResistanceResult = {
    leftRight,
    atrPeriod,
    clusterAtrMult,
    maxZonePct,
    zones: [],
  };

  const minLen = leftRight * 2 + 1;
  if (bars.length < minLen) return empty;

  const atr = atrLatest(bars, atrPeriod);
  const atrTol = atr * clusterAtrMult;
  const lastClose = bars[bars.length - 1].close;

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

  const clusters = clusterPivots(pivots, atrTol, maxZonePct);
  const zones: SrZone[] = [];

  for (const c of clusters) {
    const pivotTouches = c.prices.length;
    if (pivotTouches < minTouches) continue;

    const rawLow = Math.min(...c.prices);
    const rawHigh = Math.max(...c.prices);
    const mid = c.prices.reduce((s, x) => s + x, 0) / c.prices.length;
    const { low, high } = clampZoneWidth(rawLow, rawHigh, mid, maxZonePct);

    const highTouches = c.kinds.filter((k) => k === "high").length;
    const lowTouches = c.kinds.filter((k) => k === "low").length;
    const lastBarIndex = Math.max(...c.indices);
    const firstDate = c.dates.reduce((a, b) => (a < b ? a : b));
    const lastDate = c.dates.reduce((a, b) => (a > b ? a : b));

    const relation = relationToPrice(low, high, lastClose);
    let kind: SrZoneKind;
    if (highTouches >= lowTouches + 2) kind = "resistance";
    else if (lowTouches >= highTouches + 2) kind = "support";
    else if (relation === "below") kind = "support";
    else if (relation === "above") kind = "resistance";
    else kind = highTouches >= lowTouches ? "resistance" : "support";

    const quality = analyzeZoneQuality(bars, kind, low, high, mid, atr);

    zones.push({
      id: `${kind}-${mid.toFixed(4)}-${quality.candleTouches}`,
      kind,
      low,
      high,
      mid,
      pivotTouches,
      highTouches,
      lowTouches,
      firstDate,
      lastDate,
      lastBarIndex,
      relation,
      quality,
      strength: quality.score,
      touches: quality.candleTouches,
    });
  }

  zones.sort(
    (a, b) =>
      b.quality.score - a.quality.score ||
      b.quality.candleTouches - a.quality.candleTouches,
  );
  return {
    leftRight,
    atrPeriod,
    clusterAtrMult,
    maxZonePct,
    zones: zones.slice(0, maxZones),
  };
}

export function srZoneLabel(zone: SrZone): string {
  const role = zone.kind === "support" ? "지지" : "저항";
  return `${role} ${zone.low.toFixed(2)}–${zone.high.toFixed(2)}`;
}

export function srQualityGradeVariant(
  grade: QualityGrade,
): "positive" | "negative" | "muted" {
  if (grade === "A" || grade === "B") return "positive";
  if (grade === "D") return "negative";
  return "muted";
}
