import { RSI } from "technicalindicators";

import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  RSI_STRATEGY_META,
  type RsiStrategyId,
} from "../rsiStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { RsiStrategyId };

export interface RsiStrategyHit {
  id: RsiStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface RsiStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: RsiStrategyHit[];
  recent: RsiStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;

interface Frame {
  rsi: number;
  weighted: number | null;
  mid: number | null;
  upper: number | null;
  lower: number | null;
  bandwidth: number | null;
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: RsiStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): RsiStrategyHit {
  return {
    id,
    label: RSI_STRATEGY_META[id].labelKo,
    date: bars[barIndex].date,
    barIndex,
    direction,
    summary,
  };
}

function bandwidthPercentileRank(
  bandwidth: Array<number | null>,
  i: number,
  window = 40,
): number | null {
  const bw = bandwidth[i];
  if (bw == null || !Number.isFinite(bw)) return null;
  const start = Math.max(0, i - window + 1);
  const sample: number[] = [];
  for (let k = start; k <= i; k++) {
    const v = bandwidth[k];
    if (v != null && Number.isFinite(v)) sample.push(v);
  }
  if (sample.length < 10) return null;
  let below = 0;
  for (const v of sample) if (v <= bw) below += 1;
  return below / sample.length;
}

function localLow(bars: OHLCVBar[], i: number, left = 2, right = 2): boolean {
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= bars.length || k === i) continue;
    if (bars[k].low < bars[i].low) return false;
  }
  return i - left >= 0 && i + right < bars.length;
}

function localHigh(bars: OHLCVBar[], i: number, left = 2, right = 2): boolean {
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= bars.length || k === i) continue;
    if (bars[k].high > bars[i].high) return false;
  }
  return i - left >= 0 && i + right < bars.length;
}

function detectClassicObOs(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
  overbought: number,
  oversold: number,
): RsiStrategyHit[] {
  const hits: RsiStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    if (prev.rsi <= oversold && cur.rsi > oversold) {
      hits.push(
        hit(
          "rsi_classic_obos",
          i,
          bars,
          "bullish",
          `RSI ${oversold} 상향 돌파 (고전 과매도 탈출)`,
        ),
      );
    } else if (prev.rsi >= overbought && cur.rsi < overbought) {
      hits.push(
        hit(
          "rsi_classic_obos",
          i,
          bars,
          "bearish",
          `RSI ${overbought} 하향 돌파 (고전 과매수 탈출)`,
        ),
      );
    }
  }
  return hits;
}

function detectSuperObOs(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): RsiStrategyHit[] {
  const hits: RsiStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    const w = cur.weighted;
    const pw = prev.weighted;
    if (w == null || pw == null) continue;
    if (
      cur.upper != null &&
      prev.upper != null &&
      pw >= prev.upper &&
      w < cur.upper
    ) {
      hits.push(
        hit(
          "super_rsi_obos",
          i,
          bars,
          "bearish",
          "가중 RSI가 유동 과매수선 하향 이탈",
        ),
      );
    } else if (
      cur.lower != null &&
      prev.lower != null &&
      pw <= prev.lower &&
      w > cur.lower
    ) {
      hits.push(
        hit(
          "super_rsi_obos",
          i,
          bars,
          "bullish",
          "가중 RSI가 유동 과매도선 상향 이탈",
        ),
      );
    }
  }
  return hits;
}

function detectSqueezeMid(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): RsiStrategyHit[] {
  const hits: RsiStrategyHit[] = [];
  const bandwidth = frames.map((f) => f?.bandwidth ?? null);

  for (let i = Math.max(start, 5); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    if (
      cur.weighted == null ||
      prev.weighted == null ||
      cur.mid == null ||
      prev.mid == null
    ) {
      continue;
    }

    let squeezeBars = 0;
    for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
      const rank = bandwidthPercentileRank(bandwidth, k);
      if (rank != null && rank <= 0.25) squeezeBars += 1;
      else break;
    }
    if (squeezeBars < 3) continue;

    const rankNow = bandwidthPercentileRank(bandwidth, i);
    const rankPrev = bandwidthPercentileRank(bandwidth, i - 1);
    if (rankNow == null || rankPrev == null) continue;
    // Expansion starts: bandwidth percentile rising from squeeze
    if (!(rankNow > rankPrev && rankPrev <= 0.3)) continue;

    if (prev.weighted <= prev.mid && cur.weighted > cur.mid) {
      hits.push(
        hit(
          "super_rsi_squeeze_mid",
          i,
          bars,
          "bullish",
          "밴드 수렴 후 가중 RSI 중심선 상향 돌파",
        ),
      );
    } else if (prev.weighted >= prev.mid && cur.weighted < cur.mid) {
      hits.push(
        hit(
          "super_rsi_squeeze_mid",
          i,
          bars,
          "bearish",
          "밴드 수렴 후 가중 RSI 중심선 하향 돌파",
        ),
      );
    }
  }
  return hits;
}

function detectDivergence(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): RsiStrategyHit[] {
  const hits: RsiStrategyHit[] = [];
  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];

  for (let i = Math.max(start, 3); i < bars.length - 2; i++) {
    if (frames[i] && localLow(bars, i)) pivotLows.push(i);
    if (frames[i] && localHigh(bars, i)) pivotHighs.push(i);
  }

  for (let p = 1; p < pivotLows.length; p++) {
    const a = pivotLows[p - 1]!;
    const b = pivotLows[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb) continue;
    if (bars[b]!.low < bars[a]!.low && fb.rsi > fa.rsi + 1) {
      hits.push(
        hit(
          "rsi_divergence",
          b,
          bars,
          "bullish",
          "가격 LL + RSI HL 상승 다이버전스",
        ),
      );
    }
  }

  for (let p = 1; p < pivotHighs.length; p++) {
    const a = pivotHighs[p - 1]!;
    const b = pivotHighs[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb) continue;
    if (bars[b]!.high > bars[a]!.high && fb.rsi < fa.rsi - 1) {
      hits.push(
        hit(
          "rsi_divergence",
          b,
          bars,
          "bearish",
          "가격 HH + RSI LH 하락 다이버전스",
        ),
      );
    }
  }

  return hits;
}

function detectDoubleRsi(
  bars: OHLCVBar[],
  start: number,
): RsiStrategyHit[] {
  const hits: RsiStrategyHit[] = [];
  if (bars.length < 25) return hits;
  const closes = bars.map((b) => b.close);
  const shortVals = RSI.calculate({ period: 7, values: closes });
  const longVals = RSI.calculate({ period: 21, values: closes });
  const shortPad = closes.length - shortVals.length;
  const longPad = closes.length - longVals.length;

  const shortAt = (i: number): number | null => {
    const j = i - shortPad;
    if (j < 0 || j >= shortVals.length) return null;
    const v = shortVals[j];
    return v != null && Number.isFinite(v) ? v : null;
  };
  const longAt = (i: number): number | null => {
    const j = i - longPad;
    if (j < 0 || j >= longVals.length) return null;
    const v = longVals[j];
    return v != null && Number.isFinite(v) ? v : null;
  };

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const s0 = shortAt(i - 1);
    const s1 = shortAt(i);
    const l0 = longAt(i - 1);
    const l1 = longAt(i);
    if (s0 == null || s1 == null || l0 == null || l1 == null) continue;
    if (s0 <= l0 && s1 > l1) {
      hits.push(
        hit(
          "double_rsi_cross",
          i,
          bars,
          "bullish",
          "단기 RSI(7)가 장기 RSI(21) 상향 돌파",
        ),
      );
    } else if (s0 >= l0 && s1 < l1) {
      hits.push(
        hit(
          "double_rsi_cross",
          i,
          bars,
          "bearish",
          "단기 RSI(7)가 장기 RSI(21) 하향 돌파",
        ),
      );
    }
  }
  return hits;
}

function capPerStrategy(hits: RsiStrategyHit[]): RsiStrategyHit[] {
  const counts = new Map<RsiStrategyId, number>();
  const out: RsiStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function detectRsiStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  options?: {
    lookbackBars?: number;
    overbought?: number;
    oversold?: number;
  },
): RsiStrategyResult | null {
  const rsiOut = indicators.indicators.rsi;
  if (!rsiOut?.series.rsi?.length) return null;

  const rsi = mapSeries(rsiOut.series.rsi);
  const weighted = mapSeries(rsiOut.series.rsiWeighted);
  const mid = mapSeries(rsiOut.series.rsiMid);
  const upper = mapSeries(rsiOut.series.rsiUpper);
  const lower = mapSeries(rsiOut.series.rsiLower);

  const frames: Array<Frame | null> = bars.map((bar) => {
    const r = rsi.get(bar.date);
    if (r == null) return null;
    const u = upper.get(bar.date) ?? null;
    const m = mid.get(bar.date) ?? null;
    const l = lower.get(bar.date) ?? null;
    let bw: number | null = null;
    if (u != null && l != null && Number.isFinite(u - l)) {
      bw = u - l;
    }
    return {
      rsi: r,
      weighted: weighted.get(bar.date) ?? null,
      mid: m,
      upper: u,
      lower: l,
      bandwidth: bw,
    };
  });

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);
  const overbought = options?.overbought ?? 70;
  const oversold = options?.oversold ?? 30;

  const all = [
    ...detectClassicObOs(bars, frames, start, overbought, oversold),
    ...detectSuperObOs(bars, frames, start),
    ...detectSqueezeMid(bars, frames, start),
    ...detectDivergence(bars, frames, start),
    ...detectDoubleRsi(bars, start),
  ];

  const inWindow = all.filter((h) => h.barIndex >= start);
  const stats = scoreSignalHits(bars, inWindow);
  const recent = capPerStrategy(inWindow);
  const lastIdx = bars.length - 1;
  const onLatestBar = recent.filter((h) => h.barIndex === lastIdx);

  return {
    lookbackBars: lookback,
    latestBarDate: bars[lastIdx]?.date ?? "",
    onLatestBar,
    recent,
    stats,
  };
}
