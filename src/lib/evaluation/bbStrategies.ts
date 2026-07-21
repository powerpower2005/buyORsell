import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  BB_STRATEGY_META,
  type BbStrategyId,
} from "../bbStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { BbStrategyId };

export interface BbStrategyHit {
  id: BbStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface BbStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: BbStrategyHit[];
  recent: BbStrategyHit[];
  /** Uncapped hits in lookback (backtest / confluence). */
  signals: BbStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;

interface Frame {
  upper: number;
  middle: number;
  lower: number;
  percentB: number;
  bandwidth: number;
  rsi: number | null;
  mfi: number | null;
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: BbStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): BbStrategyHit {
  return {
    id,
    label: BB_STRATEGY_META[id].labelKo,
    date: bars[barIndex].date,
    barIndex,
    direction,
    summary,
  };
}

function isRangeRegime(
  middle: Array<number | null>,
  i: number,
  span = 5,
  maxMove = 0.02,
): boolean {
  const j = i - span;
  if (j < 0) return false;
  const a = middle[j];
  const b = middle[i];
  if (a == null || b == null || a <= 0) return false;
  return Math.abs(b - a) / a <= maxMove;
}

function isUptrend(
  middle: Array<number | null>,
  i: number,
  span = 5,
): boolean {
  const j = i - span;
  if (j < 0) return false;
  const a = middle[j];
  const b = middle[i];
  if (a == null || b == null) return false;
  return b > a;
}

function isDowntrend(
  middle: Array<number | null>,
  i: number,
  span = 5,
): boolean {
  const j = i - span;
  if (j < 0) return false;
  const a = middle[j];
  const b = middle[i];
  if (a == null || b == null) return false;
  return b < a;
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

function detectBandSr(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): BbStrategyHit[] {
  const hits: BbStrategyHit[] = [];
  const middle = frames.map((f) => f?.middle ?? null);

  for (let i = Math.max(start, 5); i < bars.length; i++) {
    const f = frames[i];
    if (!f || !isRangeRegime(middle, i)) continue;
    const bar = bars[i];
    const bandW = f.upper - f.lower;
    if (!(bandW > 0)) continue;
    const touchPad = bandW * 0.03;

    const touchLower = bar.low <= f.lower + touchPad;
    const touchUpper = bar.high >= f.upper - touchPad;
    if (touchLower && bar.close >= f.lower && bar.close > bar.open) {
      hits.push(
        hit("band_sr", i, bars, "bullish", "하단 지지 터치 후 반등 롱"),
      );
    } else if (touchUpper && bar.close <= f.upper && bar.close < bar.open) {
      hits.push(
        hit("band_sr", i, bars, "bearish", "상단 저항 터치 후 반락 숏"),
      );
    }
  }
  return hits;
}

function detectBandBreakout(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): BbStrategyHit[] {
  const hits: BbStrategyHit[] = [];
  const middle = frames.map((f) => f?.middle ?? null);
  let lastUpperBreak: number | null = null;
  let lastLowerBreak: number | null = null;

  for (let i = Math.max(start, 6); i < bars.length; i++) {
    const f = frames[i];
    const prev = frames[i - 1];
    if (!f || !prev) continue;
    const close = bars[i].close;
    const prevClose = bars[i - 1].close;

    if (close < f.middle) lastUpperBreak = null;
    if (close > f.middle) lastLowerBreak = null;

    const upperBreak = prevClose <= prev.upper && close > f.upper;
    const lowerBreak = prevClose >= prev.lower && close < f.lower;

    if (upperBreak && isUptrend(middle, i)) {
      if (
        lastUpperBreak != null &&
        i - lastUpperBreak >= 2 &&
        i - lastUpperBreak <= 20
      ) {
        hits.push(
          hit(
            "band_breakout",
            i,
            bars,
            "bullish",
            "상승 추세 두 번째 상단 돌파 롱",
          ),
        );
        lastUpperBreak = null;
      } else {
        lastUpperBreak = i;
      }
    }

    if (lowerBreak && isDowntrend(middle, i)) {
      if (
        lastLowerBreak != null &&
        i - lastLowerBreak >= 2 &&
        i - lastLowerBreak <= 20
      ) {
        hits.push(
          hit(
            "band_breakout",
            i,
            bars,
            "bearish",
            "하락 추세 두 번째 하단 돌파 숏",
          ),
        );
        lastLowerBreak = null;
      } else {
        lastLowerBreak = i;
      }
    }
  }
  return hits;
}

function detectSqueeze(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): BbStrategyHit[] {
  const hits: BbStrategyHit[] = [];
  const bandwidth = frames.map((f) => f?.bandwidth ?? null);
  let squeezeStreak = 0;
  let releaseWindow = 0;

  for (let i = Math.max(start, 20); i < bars.length; i++) {
    const f = frames[i];
    if (!f) {
      squeezeStreak = 0;
      continue;
    }
    const rank = bandwidthPercentileRank(bandwidth, i);
    const inSqueeze = rank != null && rank <= 0.2;
    if (inSqueeze) {
      squeezeStreak += 1;
      continue;
    }

    if (squeezeStreak >= 3) releaseWindow = 5;
    squeezeStreak = 0;
    if (releaseWindow <= 0) continue;
    releaseWindow -= 1;

    const prev = frames[i - 1];
    if (!prev) continue;
    const close = bars[i].close;
    const prevClose = bars[i - 1].close;

    if (prevClose <= prev.upper && close > f.upper) {
      hits.push(
        hit("squeeze", i, bars, "bullish", "스퀴즈 해제 후 상단 돌파 롱"),
      );
      releaseWindow = 0;
    } else if (prevClose >= prev.lower && close < f.lower) {
      hits.push(
        hit("squeeze", i, bars, "bearish", "스퀴즈 해제 후 하단 이탈 숏"),
      );
      releaseWindow = 0;
    }
  }
  return hits;
}

function detectTrendFollow(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): BbStrategyHit[] {
  const hits: BbStrategyHit[] = [];

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const f = frames[i];
    const prev = frames[i - 1];
    if (!f || !prev || f.mfi == null || prev.mfi == null) continue;

    const longNow = f.percentB >= 0.8 && f.mfi >= 80;
    const longPrev = prev.percentB >= 0.8 && prev.mfi >= 80;
    const shortNow = f.percentB < 0.2 && f.mfi < 20;
    const shortPrev = prev.percentB < 0.2 && prev.mfi < 20;

    if (longNow && !longPrev) {
      hits.push(
        hit(
          "trend_follow",
          i,
          bars,
          "bullish",
          `%B ${f.percentB.toFixed(2)} · MFI ${f.mfi.toFixed(0)} 강세 롱`,
        ),
      );
    } else if (shortNow && !shortPrev) {
      hits.push(
        hit(
          "trend_follow",
          i,
          bars,
          "bearish",
          `%B ${f.percentB.toFixed(2)} · MFI ${f.mfi.toFixed(0)} 약세 숏`,
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
): BbStrategyHit[] {
  const hits: BbStrategyHit[] = [];
  const pivotsLow: number[] = [];
  const pivotsHigh: number[] = [];

  for (let i = Math.max(start, 2); i < bars.length - 2; i++) {
    if (localLow(bars, i)) pivotsLow.push(i);
    if (localHigh(bars, i)) pivotsHigh.push(i);
  }

  const pendingBull: { a: number; b: number }[] = [];
  for (let p = 1; p < pivotsLow.length; p++) {
    const a = pivotsLow[p - 1];
    const b = pivotsLow[p];
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb || fa.rsi == null || fb.rsi == null) continue;
    const nearBand =
      bars[a].low <= fa.lower + (fa.upper - fa.lower) * 0.08 &&
      bars[b].low <= fb.lower + (fb.upper - fb.lower) * 0.08;
    if (!nearBand) continue;
    if (bars[b].low < bars[a].low && fb.rsi > fa.rsi) {
      pendingBull.push({ a, b });
    }
  }

  const pendingBear: { a: number; b: number }[] = [];
  for (let p = 1; p < pivotsHigh.length; p++) {
    const a = pivotsHigh[p - 1];
    const b = pivotsHigh[p];
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb || fa.rsi == null || fb.rsi == null) continue;
    const nearBand =
      bars[a].high >= fa.upper - (fa.upper - fa.lower) * 0.08 &&
      bars[b].high >= fb.upper - (fb.upper - fb.lower) * 0.08;
    if (!nearBand) continue;
    if (bars[b].high > bars[a].high && fb.rsi < fa.rsi) {
      pendingBear.push({ a, b });
    }
  }

  for (const { b } of pendingBull) {
    for (let i = b + 1; i < Math.min(bars.length, b + 12); i++) {
      const f = frames[i];
      const prev = frames[i - 1];
      if (!f || !prev) continue;
      if (bars[i - 1].close <= prev.middle && bars[i].close > f.middle) {
        hits.push(
          hit(
            "divergence",
            i,
            bars,
            "bullish",
            "RSI 강세 다이버전스 후 중심선 상향 돌파",
          ),
        );
        break;
      }
    }
  }

  for (const { b } of pendingBear) {
    for (let i = b + 1; i < Math.min(bars.length, b + 12); i++) {
      const f = frames[i];
      const prev = frames[i - 1];
      if (!f || !prev) continue;
      if (bars[i - 1].close >= prev.middle && bars[i].close < f.middle) {
        hits.push(
          hit(
            "divergence",
            i,
            bars,
            "bearish",
            "RSI 약세 다이버전스 후 중심선 하향 돌파",
          ),
        );
        break;
      }
    }
  }

  return hits;
}

function capPerStrategy(hits: BbStrategyHit[]): BbStrategyHit[] {
  const counts = new Map<BbStrategyId, number>();
  const out: BbStrategyHit[] = [];
  // Keep newest first when capping
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function detectBbStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  options?: { lookbackBars?: number },
): BbStrategyResult | null {
  const bb = indicators.indicators.bb;
  if (!bb?.series.bbUpper?.length) return null;

  const upper = mapSeries(bb.series.bbUpper);
  const middle = mapSeries(bb.series.bbMiddle);
  const lower = mapSeries(bb.series.bbLower);
  const percentB = mapSeries(bb.series.bbPercentB);
  const bandwidth = mapSeries(bb.series.bbBandwidth);
  const rsi = mapSeries(indicators.indicators.rsi?.series.rsi);
  const mfi = mapSeries(indicators.indicators.mfi?.series.mfi);

  const frames: Array<Frame | null> = bars.map((bar) => {
    const u = upper.get(bar.date);
    const m = middle.get(bar.date);
    const l = lower.get(bar.date);
    if (u == null || m == null || l == null) return null;
    const width = u - l;
    const pb =
      percentB.get(bar.date) ?? (width > 0 ? (bar.close - l) / width : NaN);
    const bw = bandwidth.get(bar.date) ?? (m > 0 ? width / m : NaN);
    if (!Number.isFinite(pb) || !Number.isFinite(bw)) return null;
    return {
      upper: u,
      middle: m,
      lower: l,
      percentB: pb,
      bandwidth: bw,
      rsi: rsi.get(bar.date) ?? null,
      mfi: mfi.get(bar.date) ?? null,
    };
  });

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const all = [
    ...detectBandSr(bars, frames, start),
    ...detectBandBreakout(bars, frames, start),
    ...detectSqueeze(bars, frames, start),
    ...detectTrendFollow(bars, frames, start),
    ...detectDivergence(bars, frames, start),
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
    signals: inWindow,
    stats,
  };
}
