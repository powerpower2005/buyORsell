import type {
  IndicatorResults,
  OHLCVBar,
  SeriesPoint,
  TrendLabel,
} from "../types";
import {
  STOCH_STRATEGY_META,
  type StochStrategyId,
} from "../stochStrategyMeta";
import type { SupportResistanceResult } from "./supportResistance";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { StochStrategyId };

export interface StochStrategyHit {
  id: StochStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface StochStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: StochStrategyHit[];
  recent: StochStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;

interface Frame {
  k: number;
  d: number;
  sma20: number | null;
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: StochStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): StochStrategyHit {
  return {
    id,
    label: STOCH_STRATEGY_META[id].labelKo,
    date: bars[barIndex]!.date,
    barIndex,
    direction,
    summary,
  };
}

function localLow(bars: OHLCVBar[], i: number, left = 2, right = 2): boolean {
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= bars.length || k === i) continue;
    if (bars[k]!.low < bars[i]!.low) return false;
  }
  return i - left >= 0 && i + right < bars.length;
}

function localHigh(bars: OHLCVBar[], i: number, left = 2, right = 2): boolean {
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= bars.length || k === i) continue;
    if (bars[k]!.high > bars[i]!.high) return false;
  }
  return i - left >= 0 && i + right < bars.length;
}

function localLowK(
  frames: Array<Frame | null>,
  i: number,
  left = 2,
  right = 2,
): boolean {
  const cur = frames[i];
  if (!cur) return false;
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= frames.length || k === i) continue;
    const f = frames[k];
    if (!f || f.k < cur.k) return false;
  }
  return i - left >= 0 && i + right < frames.length;
}

function localHighK(
  frames: Array<Frame | null>,
  i: number,
  left = 2,
  right = 2,
): boolean {
  const cur = frames[i];
  if (!cur) return false;
  for (let k = i - left; k <= i + right; k++) {
    if (k < 0 || k >= frames.length || k === i) continue;
    const f = frames[k];
    if (!f || f.k > cur.k) return false;
  }
  return i - left >= 0 && i + right < frames.length;
}

function goldenCross(prev: Frame, cur: Frame): boolean {
  return prev.k <= prev.d && cur.k > cur.d;
}

function deadCross(prev: Frame, cur: Frame): boolean {
  return prev.k >= prev.d && cur.k < cur.d;
}

function nearSma20(bar: OHLCVBar, sma: number, pct = 0.02): boolean {
  const mid = (bar.high + bar.low) / 2;
  return Math.abs(mid - sma) / sma <= pct || bar.low <= sma * 1.005;
}

function nearSma20Short(bar: OHLCVBar, sma: number, pct = 0.02): boolean {
  const mid = (bar.high + bar.low) / 2;
  return Math.abs(mid - sma) / sma <= pct || bar.high >= sma * 0.995;
}

function detectMa20Cross(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): StochStrategyHit[] {
  const hits: StochStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev || cur.sma20 == null) continue;
    const sma = cur.sma20;
    const bar = bars[i]!;

    if (
      bar.close > sma * 0.998 &&
      nearSma20(bar, sma) &&
      goldenCross(prev, cur)
    ) {
      hits.push(
        hit(
          "stoch_ma20_cross",
          i,
          bars,
          "bullish",
          "SMA20 위 눌림 후 스토캐 골든",
        ),
      );
    } else if (
      bar.close < sma * 1.002 &&
      nearSma20Short(bar, sma) &&
      deadCross(prev, cur)
    ) {
      hits.push(
        hit(
          "stoch_ma20_cross",
          i,
          bars,
          "bearish",
          "SMA20 아래 반등 후 스토캐 데드",
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
  oversold: number,
  overbought: number,
): StochStrategyHit[] {
  const hits: StochStrategyHit[] = [];
  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];

  for (let i = Math.max(start, 3); i < bars.length - 2; i++) {
    if (frames[i] && localLow(bars, i)) pivotLows.push(i);
    if (frames[i] && localHigh(bars, i)) pivotHighs.push(i);
  }

  const pendingBull: number[] = [];
  const pendingBear: number[] = [];

  for (let p = 1; p < pivotLows.length; p++) {
    const a = pivotLows[p - 1]!;
    const b = pivotLows[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb) continue;
    if (
      bars[b]!.low < bars[a]!.low &&
      fb.k > fa.k &&
      fa.k <= oversold
    ) {
      pendingBull.push(b);
    }
  }
  for (let p = 1; p < pivotHighs.length; p++) {
    const a = pivotHighs[p - 1]!;
    const b = pivotHighs[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const fa = frames[a];
    const fb = frames[b];
    if (!fa || !fb) continue;
    if (
      bars[b]!.high > bars[a]!.high &&
      fb.k < fa.k &&
      fa.k >= overbought
    ) {
      pendingBear.push(b);
    }
  }

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    const bullDiv = pendingBull.some((d) => i >= d && i - d <= 10);
    const bearDiv = pendingBear.some((d) => i >= d && i - d <= 10);
    if (bullDiv && goldenCross(prev, cur)) {
      hits.push(
        hit(
          "stoch_divergence",
          i,
          bars,
          "bullish",
          "상승 다이버전스 후 스토캐 골든",
        ),
      );
    } else if (bearDiv && deadCross(prev, cur)) {
      hits.push(
        hit(
          "stoch_divergence",
          i,
          bars,
          "bearish",
          "하락 다이버전스 후 스토캐 데드",
        ),
      );
    }
  }
  return hits;
}

function detectSrBounce(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
  sr: SupportResistanceResult | null,
  oversold: number,
  overbought: number,
): StochStrategyHit[] {
  const hits: StochStrategyHit[] = [];
  if (!sr?.zones.length) return hits;

  const supports = sr.zones.filter(
    (z) => z.kind === "support" && !z.quality.broken && z.quality.touchEvents >= 2,
  );
  const resists = sr.zones.filter(
    (z) =>
      z.kind === "resistance" &&
      !z.quality.broken &&
      z.quality.touchEvents >= 2,
  );

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    const bar = bars[i]!;
    const mid = (bar.high + bar.low) / 2;

    const nearSupport = supports.some((z) => {
      const pad = Math.max((z.high - z.low) * 0.5, z.mid * 0.004);
      return mid >= z.low - pad && mid <= z.high + pad;
    });
    const nearResist = resists.some((z) => {
      const pad = Math.max((z.high - z.low) * 0.5, z.mid * 0.004);
      return mid >= z.low - pad && mid <= z.high + pad;
    });

    if (
      nearSupport &&
      prev.k <= oversold &&
      cur.k > oversold
    ) {
      hits.push(
        hit(
          "stoch_sr_bounce",
          i,
          bars,
          "bullish",
          "지지 재접촉 + %K 과매도선 상향",
        ),
      );
    } else if (
      nearResist &&
      prev.k >= overbought &&
      cur.k < overbought
    ) {
      hits.push(
        hit(
          "stoch_sr_bounce",
          i,
          bars,
          "bearish",
          "저항 재접촉 + %K 과매수선 하향",
        ),
      );
    }
  }
  return hits;
}

function detectTripleBottom(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): StochStrategyHit[] {
  const hits: StochStrategyHit[] = [];
  const kLows: number[] = [];
  const kHighs: number[] = [];

  for (let i = Math.max(3, start - 50); i < bars.length - 2; i++) {
    if (localLowK(frames, i)) kLows.push(i);
    if (localHighK(frames, i)) kHighs.push(i);
  }

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;

    const lows = kLows.filter((p) => p < i && p >= i - 50);
    if (lows.length >= 3 && goldenCross(prev, cur)) {
      const a = lows[lows.length - 3]!;
      const b = lows[lows.length - 2]!;
      const c = lows[lows.length - 1]!;
      const fa = frames[a];
      const fb = frames[b];
      const fc = frames[c];
      if (
        fa &&
        fb &&
        fc &&
        fa.k < fb.k &&
        fb.k < fc.k &&
        i - c <= 8
      ) {
        hits.push(
          hit(
            "stoch_triple_bottom",
            i,
            bars,
            "bullish",
            "스토캐 3중 바닥 후 골든 크로스",
          ),
        );
      }
    }

    const highs = kHighs.filter((p) => p < i && p >= i - 50);
    if (highs.length >= 3 && deadCross(prev, cur)) {
      const a = highs[highs.length - 3]!;
      const b = highs[highs.length - 2]!;
      const c = highs[highs.length - 1]!;
      const fa = frames[a];
      const fb = frames[b];
      const fc = frames[c];
      if (
        fa &&
        fb &&
        fc &&
        fa.k > fb.k &&
        fb.k > fc.k &&
        i - c <= 8
      ) {
        hits.push(
          hit(
            "stoch_triple_bottom",
            i,
            bars,
            "bearish",
            "스토캐 3중 천장 후 데드 크로스",
          ),
        );
      }
    }
  }
  return hits;
}

function capPerStrategy(hits: StochStrategyHit[]): StochStrategyHit[] {
  const counts = new Map<StochStrategyId, number>();
  const out: StochStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function detectStochStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  supportResistance: SupportResistanceResult | null,
  options?: {
    lookbackBars?: number;
    overbought?: number;
    oversold?: number;
  },
): StochStrategyResult | null {
  const stochOut = indicators.indicators.stoch;
  if (!stochOut?.series.stochK?.length) return null;

  const kMap = mapSeries(stochOut.series.stochK);
  const dMap = mapSeries(stochOut.series.stochD);
  const sma20 = mapSeries(indicators.indicators.sma?.series["sma:20"]);
  const overbought = options?.overbought ?? 80;
  const oversold = options?.oversold ?? 20;

  const frames: Array<Frame | null> = bars.map((bar) => {
    const k = kMap.get(bar.date);
    const d = dMap.get(bar.date);
    if (k == null || d == null) return null;
    return {
      k,
      d,
      sma20: sma20.get(bar.date) ?? null,
    };
  });

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const all = [
    ...detectMa20Cross(bars, frames, start),
    ...detectDivergence(bars, frames, start, oversold, overbought),
    ...detectSrBounce(
      bars,
      frames,
      start,
      supportResistance,
      oversold,
      overbought,
    ),
    ...detectTripleBottom(bars, frames, start),
  ];

  const inWindow = all.filter((h) => h.barIndex >= start);
  const stats = scoreSignalHits(bars, inWindow);
  const recent = capPerStrategy(inWindow);
  const lastIdx = bars.length - 1;

  return {
    lookbackBars: lookback,
    latestBarDate: bars[lastIdx]?.date ?? "",
    onLatestBar: recent.filter((h) => h.barIndex === lastIdx),
    recent,
    stats,
  };
}
