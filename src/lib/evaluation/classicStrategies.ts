import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  CLASSIC_STRATEGY_META,
  type ClassicStrategyId,
} from "../classicStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { ClassicStrategyId };

export interface ClassicStrategyHit {
  id: ClassicStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

/** Gann fan ray for canvas overlay (ATR-scaled 1×1 / 1×2 / 2×1). */
export interface GannFanRay {
  /** Anchor bar index. */
  anchorIndex: number;
  anchorDate: string;
  anchorPrice: number;
  /** Price change per bar (signed). */
  slope: number;
  /** "1x1" | "1x2" | "2x1" */
  kind: "1x1" | "1x2" | "2x1";
  /** bullish fan from low (up) or bearish from high (down). */
  bias: "bullish" | "bearish";
}

export interface GannZoneGuide {
  p1Index: number;
  p2Index: number;
  p1Price: number;
  p2Price: number;
  rzh: number;
  rzl: number;
  bias: "bullish" | "bearish";
}

export interface ClassicStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: ClassicStrategyHit[];
  recent: ClassicStrategyHit[];
  signals: ClassicStrategyHit[];
  stats: SignalStatsMap;
  /** Latest fans for chart overlay (when gann_zone is relevant). */
  gannFans: GannFanRay[];
  gannZones: GannZoneGuide[];
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;
const PIVOT_N = 3;

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: ClassicStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): ClassicStrategyHit {
  return {
    id,
    label: CLASSIC_STRATEGY_META[id].labelKo,
    date: bars[barIndex]!.date,
    barIndex,
    direction,
    summary,
  };
}

function isSwingHigh(bars: OHLCVBar[], idx: number, n: number): boolean {
  const h = bars[idx]!.high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx || i < 0 || i >= bars.length) continue;
    if (bars[i]!.high >= h) return false;
  }
  return true;
}

function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  const l = bars[idx]!.low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx || i < 0 || i >= bars.length) continue;
    if (bars[i]!.low <= l) return false;
  }
  return true;
}

function collectPivots(bars: OHLCVBar[], start: number): {
  highs: number[];
  lows: number[];
} {
  const highs: number[] = [];
  const lows: number[] = [];
  const end = bars.length - PIVOT_N;
  for (let i = Math.max(start, PIVOT_N); i < end; i++) {
    if (isSwingHigh(bars, i, PIVOT_N)) highs.push(i);
    if (isSwingLow(bars, i, PIVOT_N)) lows.push(i);
  }
  return { highs, lows };
}

function atrAt(bars: OHLCVBar[], i: number, period = 14): number {
  const start = Math.max(1, i - period + 1);
  let sum = 0;
  let n = 0;
  for (let k = start; k <= i; k++) {
    const bar = bars[k]!;
    const prev = bars[k - 1]!;
    const tr = Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prev.close),
      Math.abs(bar.low - prev.close),
    );
    sum += tr;
    n += 1;
  }
  const mid = (bars[i]!.high + bars[i]!.low) / 2;
  return n > 0 ? sum / n : mid * 0.01;
}

function capPerStrategy(hits: ClassicStrategyHit[]): ClassicStrategyHit[] {
  const counts = new Map<ClassicStrategyId, number>();
  const out: ClassicStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

function detectMaGoldenDead(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  start: number,
): ClassicStrategyHit[] {
  const short = mapSeries(indicators.indicators.sma?.series["sma:20"]);
  const long = mapSeries(indicators.indicators.sma?.series["sma:50"]);
  const hits: ClassicStrategyHit[] = [];

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const d0 = bars[i - 1]!.date;
    const d1 = bars[i]!.date;
    const s0 = short.get(d0);
    const s1 = short.get(d1);
    const l0 = long.get(d0);
    const l1 = long.get(d1);
    if (s0 == null || s1 == null || l0 == null || l1 == null) continue;

    if (s0 <= l0 && s1 > l1) {
      hits.push(
        hit(
          "ma_golden_dead",
          i,
          bars,
          "bullish",
          "SMA20↑SMA50 골든크로스",
        ),
      );
    } else if (s0 >= l0 && s1 < l1) {
      hits.push(
        hit(
          "ma_golden_dead",
          i,
          bars,
          "bearish",
          "SMA20↓SMA50 데드크로스",
        ),
      );
    }
  }
  return hits;
}

function inFibZone(
  price: number,
  low: number,
  high: number,
): { inZone: boolean; retrace: number } {
  const range = high - low;
  if (!(range > 0)) return { inZone: false, retrace: 0 };
  const retrace = (high - price) / range;
  return { inZone: retrace >= 0.382 && retrace <= 0.618, retrace };
}

function detectFibWavePullback(
  bars: OHLCVBar[],
  start: number,
): ClassicStrategyHit[] {
  const { highs, lows } = collectPivots(bars, Math.max(0, start - 40));
  const hits: ClassicStrategyHit[] = [];
  let lastBullKey = "";
  let lastBearKey = "";

  // Bullish: low → high impulse, then pullback bounce in 38.2–61.8
  for (let hi = 0; hi < highs.length; hi++) {
    const hIdx = highs[hi]!;
    if (hIdx < start) continue;
    const priorLows = lows.filter((l) => l < hIdx && hIdx - l >= 3 && hIdx - l <= 60);
    if (!priorLows.length) continue;
    const lIdx = priorLows[priorLows.length - 1]!;
    const low = bars[lIdx]!.low;
    const high = bars[hIdx]!.high;
    if (!(high > low)) continue;

    const scanTo = Math.min(bars.length - 1, hIdx + 40);
    for (let i = hIdx + 2; i <= scanTo; i++) {
      // Invalidate if breaks impulse low (Elliott rule 2)
      if (bars[i]!.low < low) break;
      // Invalidate if makes new high before entry (extension, not pullback)
      if (bars[i]!.high > high * 1.002) break;

      const bar = bars[i]!;
      const { inZone } = inFibZone(bar.low, low, high);
      const mid = (bar.high + bar.low) / 2;
      const midZone = inFibZone(mid, low, high).inZone;
      if (!(inZone || midZone)) continue;
      const bullishCandle = bar.close > bar.open && bar.close > bars[i - 1]!.close;
      if (!bullishCandle) continue;

      const key = `${lIdx}-${hIdx}`;
      if (key === lastBullKey) break;
      lastBullKey = key;
      const fib382 = high - (high - low) * 0.382;
      const fib618 = high - (high - low) * 0.618;
      hits.push(
        hit(
          "fib_wave_pullback",
          i,
          bars,
          "bullish",
          `2·4파 눌림 ${fib618.toFixed(0)}~${fib382.toFixed(0)} 반등`,
        ),
      );
      break;
    }
  }

  // Bearish: high → low impulse, then bounce into 38.2–61.8 from low
  for (let li = 0; li < lows.length; li++) {
    const lIdx = lows[li]!;
    if (lIdx < start) continue;
    const priorHighs = highs.filter(
      (h) => h < lIdx && lIdx - h >= 3 && lIdx - h <= 60,
    );
    if (!priorHighs.length) continue;
    const hIdx = priorHighs[priorHighs.length - 1]!;
    const high = bars[hIdx]!.high;
    const low = bars[lIdx]!.low;
    if (!(high > low)) continue;

    const scanTo = Math.min(bars.length - 1, lIdx + 40);
    for (let i = lIdx + 2; i <= scanTo; i++) {
      if (bars[i]!.high > high) break;
      if (bars[i]!.low < low * 0.998) break;

      const bar = bars[i]!;
      // Retrace up from low: (price-low)/(high-low) in 0.382–0.618
      const range = high - low;
      const up = (bar.high - low) / range;
      const midUp = ((bar.high + bar.low) / 2 - low) / range;
      const inZone =
        (up >= 0.382 && up <= 0.618) || (midUp >= 0.382 && midUp <= 0.618);
      if (!inZone) continue;
      const bearishCandle = bar.close < bar.open && bar.close < bars[i - 1]!.close;
      if (!bearishCandle) continue;

      const key = `${hIdx}-${lIdx}`;
      if (key === lastBearKey) break;
      lastBearKey = key;
      hits.push(
        hit(
          "fib_wave_pullback",
          i,
          bars,
          "bearish",
          `2·4파 반등 저항 구간 이탈`,
        ),
      );
      break;
    }
  }

  return hits;
}

/** Gann unit price per bar ≈ ATR (1×1). */
function gannUnit(bars: OHLCVBar[], anchorIdx: number): number {
  const a = atrAt(bars, anchorIdx);
  return Math.max(a, bars[anchorIdx]!.close * 0.002);
}

function gannRzhRzl(
  p1Price: number,
  p2Price: number,
  unit: number,
  uptrendCorrection: boolean,
): { rzh: number; rzl: number } | null {
  const range = Math.abs(p2Price - p1Price);
  if (!(range > 0) || !(unit > 0)) return null;

  // Analytic intersections (see design notes): ~50% and ~33% from low in uptrend.
  if (uptrendCorrection) {
    const rzh = (p1Price + p2Price) / 2;
    const rzl = p1Price + range / 3;
    return { rzh: Math.max(rzh, rzl), rzl: Math.min(rzh, rzl) };
  }
  const rzh = p2Price - range / 3; // from low of down move... p2 is low, p1 is high
  const rzl = (p1Price + p2Price) / 2;
  return { rzh: Math.max(rzh, rzl), rzl: Math.min(rzh, rzl) };
}

function buildGannFans(
  bars: OHLCVBar[],
  lows: number[],
  highs: number[],
): { fans: GannFanRay[]; zones: GannZoneGuide[] } {
  const fans: GannFanRay[] = [];
  const zones: GannZoneGuide[] = [];
  if (bars.length < 20) return { fans, zones };

  const lastLow = lows.filter((i) => i < bars.length - 2).at(-1);
  const lastHigh = highs.filter((i) => i < bars.length - 2).at(-1);

  if (lastLow != null) {
    const unit = gannUnit(bars, lastLow);
    const price = bars[lastLow]!.low;
    const date = bars[lastLow]!.date;
    for (const [kind, mult] of [
      ["1x1", 1],
      ["1x2", 2],
      ["2x1", 0.5],
    ] as const) {
      fans.push({
        anchorIndex: lastLow,
        anchorDate: date,
        anchorPrice: price,
        slope: unit * mult,
        kind,
        bias: "bullish",
      });
    }
  }

  if (lastHigh != null) {
    const unit = gannUnit(bars, lastHigh);
    const price = bars[lastHigh]!.high;
    const date = bars[lastHigh]!.date;
    for (const [kind, mult] of [
      ["1x1", 1],
      ["1x2", 2],
      ["2x1", 0.5],
    ] as const) {
      fans.push({
        anchorIndex: lastHigh,
        anchorDate: date,
        anchorPrice: price,
        slope: -unit * mult,
        kind,
        bias: "bearish",
      });
    }
  }

  // Latest bullish impulse zone (low→high)
  if (lastHigh != null) {
    const priorLow = lows.filter((l) => l < lastHigh).at(-1);
    if (priorLow != null && lastHigh - priorLow >= 3) {
      const p1 = bars[priorLow]!.low;
      const p2 = bars[lastHigh]!.high;
      const unit = gannUnit(bars, lastHigh);
      const z = gannRzhRzl(p1, p2, unit, true);
      if (z) {
        zones.push({
          p1Index: priorLow,
          p2Index: lastHigh,
          p1Price: p1,
          p2Price: p2,
          rzh: z.rzh,
          rzl: z.rzl,
          bias: "bullish",
        });
      }
    }
  }

  // Latest bearish impulse zone (high→low)
  if (lastLow != null) {
    const priorHigh = highs.filter((h) => h < lastLow).at(-1);
    if (priorHigh != null && lastLow - priorHigh >= 3) {
      const p1 = bars[priorHigh]!.high;
      const p2 = bars[lastLow]!.low;
      const unit = gannUnit(bars, lastLow);
      const z = gannRzhRzl(p1, p2, unit, false);
      if (z) {
        zones.push({
          p1Index: priorHigh,
          p2Index: lastLow,
          p1Price: p1,
          p2Price: p2,
          rzh: z.rzh,
          rzl: z.rzl,
          bias: "bearish",
        });
      }
    }
  }

  return { fans, zones };
}

function detectGannZone(
  bars: OHLCVBar[],
  start: number,
  zones: GannZoneGuide[],
  fans: GannFanRay[],
): ClassicStrategyHit[] {
  const hits: ClassicStrategyHit[] = [];
  const used = new Set<string>();

  for (const z of zones) {
    if (z.p2Index < start - 5) continue;
    const scanFrom = Math.max(start, z.p2Index + 2);
    const scanTo = Math.min(bars.length - 1, z.p2Index + 45);

    for (let i = scanFrom; i <= scanTo; i++) {
      const bar = bars[i]!;
      const lo = Math.min(z.rzl, z.rzh);
      const hi = Math.max(z.rzl, z.rzh);
      const touches = bar.low <= hi && bar.high >= lo;
      if (!touches) continue;

      if (z.bias === "bullish") {
        if (bar.low < z.p1Price) break;
        if (bar.high > z.p2Price * 1.002) break;
        const ok = bar.close > bar.open && bar.close >= (lo + hi) / 2;
        if (!ok) continue;
        const key = `b-${z.p1Index}-${z.p2Index}`;
        if (used.has(key)) break;
        used.add(key);
        hits.push(
          hit(
            "gann_zone",
            i,
            bars,
            "bullish",
            `갠 RZL~RZH(${lo.toFixed(0)}~${hi.toFixed(0)}) 반등`,
          ),
        );
        break;
      }

      if (bar.high > z.p1Price) break;
      if (bar.low < z.p2Price * 0.998) break;
      const ok = bar.close < bar.open && bar.close <= (lo + hi) / 2;
      if (!ok) continue;
      const key = `s-${z.p1Index}-${z.p2Index}`;
      if (used.has(key)) break;
      used.add(key);
      hits.push(
        hit(
          "gann_zone",
          i,
          bars,
          "bearish",
          `갠 RZL~RZH(${lo.toFixed(0)}~${hi.toFixed(0)}) 저항`,
        ),
      );
      break;
    }
  }

  // Angle touch: price near 1×1 from latest fan within lookback
  for (const fan of fans) {
    if (fan.kind !== "1x1") continue;
    if (fan.anchorIndex < start - 80) continue;
    const scanFrom = Math.max(start, fan.anchorIndex + 3);
    for (let i = scanFrom; i < bars.length; i++) {
      const expected = fan.anchorPrice + fan.slope * (i - fan.anchorIndex);
      const bar = bars[i]!;
      const tol = Math.abs(expected) * 0.008 + atrAt(bars, i) * 0.15;
      const touched = bar.low <= expected + tol && bar.high >= expected - tol;
      if (!touched) continue;

      if (fan.bias === "bullish") {
        if (!(bar.close > bar.open && bar.close > expected)) continue;
        const key = `fan-b-${fan.anchorIndex}-${i}`;
        if (used.has(`fan-b-${fan.anchorIndex}`)) break;
        used.add(`fan-b-${fan.anchorIndex}`);
        hits.push(
          hit("gann_zone", i, bars, "bullish", "갠 1×1 지지 터치 반등"),
        );
        break;
      }
      if (!(bar.close < bar.open && bar.close < expected)) continue;
      if (used.has(`fan-s-${fan.anchorIndex}`)) break;
      used.add(`fan-s-${fan.anchorIndex}`);
      hits.push(
        hit("gann_zone", i, bars, "bearish", "갠 1×1 저항 터치"),
      );
      break;
    }
  }

  return hits;
}

export function detectClassicStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  options?: { lookbackBars?: number },
): ClassicStrategyResult | null {
  if (bars.length < 40) return null;

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);
  const { highs, lows } = collectPivots(bars, Math.max(0, start - 60));
  const { fans, zones } = buildGannFans(bars, lows, highs);

  const all = [
    ...detectMaGoldenDead(bars, indicators, start),
    ...detectFibWavePullback(bars, start),
    ...detectGannZone(bars, start, zones, fans),
  ];

  const inWindow = all.filter((h) => h.barIndex >= start);
  const stats = scoreSignalHits(bars, inWindow);
  const recent = capPerStrategy(inWindow);
  const lastIdx = bars.length - 1;

  return {
    lookbackBars: lookback,
    latestBarDate: bars[lastIdx]!.date,
    onLatestBar: recent.filter((h) => h.barIndex === lastIdx),
    recent,
    signals: inWindow,
    stats,
    gannFans: fans,
    gannZones: zones,
  };
}
