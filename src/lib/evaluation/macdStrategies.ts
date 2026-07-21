import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  MACD_STRATEGY_META,
  type MacdStrategyId,
} from "../macdStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { MacdStrategyId };

export interface MacdStrategyHit {
  id: MacdStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface MacdStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: MacdStrategyHit[];
  recent: MacdStrategyHit[];
  /** Uncapped hits in lookback (backtest / confluence). */
  signals: MacdStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;

interface Frame {
  macd: number;
  signal: number;
  hist: number;
  rsi: number | null;
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: MacdStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): MacdStrategyHit {
  return {
    id,
    label: MACD_STRATEGY_META[id].labelKo,
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

function goldenCross(prev: Frame, cur: Frame): boolean {
  return prev.macd <= prev.signal && cur.macd > cur.signal;
}

function deadCross(prev: Frame, cur: Frame): boolean {
  return prev.macd >= prev.signal && cur.macd < cur.signal;
}

function detectSignalCross(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): MacdStrategyHit[] {
  const hits: MacdStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    if (goldenCross(prev, cur)) {
      const zeroOk = cur.macd > 0;
      hits.push(
        hit(
          "macd_signal_cross",
          i,
          bars,
          "bullish",
          zeroOk
            ? "MACD 골든 크로스 (0선 위 확인)"
            : "MACD 골든 크로스",
        ),
      );
    } else if (deadCross(prev, cur)) {
      const zeroOk = cur.macd < 0;
      hits.push(
        hit(
          "macd_signal_cross",
          i,
          bars,
          "bearish",
          zeroOk
            ? "MACD 데드 크로스 (0선 아래 확인)"
            : "MACD 데드 크로스",
        ),
      );
    }
  }
  return hits;
}

function detectZeroLine(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): MacdStrategyHit[] {
  const hits: MacdStrategyHit[] = [];
  let lastZeroBull: number | null = null;
  let lastZeroBear: number | null = null;

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;

    if (prev.macd <= 0 && cur.macd > 0) {
      lastZeroBull = i;
      hits.push(
        hit("macd_zero_line", i, bars, "bullish", "MACD 기준선(0) 상향 돌파"),
      );
    } else if (prev.macd >= 0 && cur.macd < 0) {
      lastZeroBear = i;
      hits.push(
        hit("macd_zero_line", i, bars, "bearish", "MACD 기준선(0) 하향 돌파"),
      );
    }

    // Pullback long: after zero-up, MACD still > 0, dips to signal then turns up
    if (
      lastZeroBull != null &&
      i > lastZeroBull &&
      i - lastZeroBull <= 20 &&
      cur.macd > 0 &&
      prev.macd > 0
    ) {
      const nearSignal =
        Math.abs(prev.macd - prev.signal) <=
        Math.max(Math.abs(prev.signal) * 0.15, 1e-6);
      if (nearSignal && prev.macd <= prev.signal && cur.macd > cur.signal) {
        hits.push(
          hit(
            "macd_zero_line",
            i,
            bars,
            "bullish",
            "0선 돌파 후 시그널 눌림 재상승",
          ),
        );
      }
    }

    if (
      lastZeroBear != null &&
      i > lastZeroBear &&
      i - lastZeroBear <= 20 &&
      cur.macd < 0 &&
      prev.macd < 0
    ) {
      const nearSignal =
        Math.abs(prev.macd - prev.signal) <=
        Math.max(Math.abs(prev.signal) * 0.15, 1e-6);
      if (nearSignal && prev.macd >= prev.signal && cur.macd < cur.signal) {
        hits.push(
          hit(
            "macd_zero_line",
            i,
            bars,
            "bearish",
            "0선 이탈 후 시그널 반등 재하락",
          ),
        );
      }
    }
  }
  return hits;
}

function detectRsiConfirm(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): MacdStrategyHit[] {
  const hits: MacdStrategyHit[] = [];
  let lastOversoldExit: number | null = null;
  let lastOverboughtExit: number | null = null;

  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev || cur.rsi == null || prev.rsi == null) continue;

    if (prev.rsi <= 30 && cur.rsi > 30) lastOversoldExit = i;
    if (prev.rsi >= 80 && cur.rsi < 80) lastOverboughtExit = i;

    if (
      lastOversoldExit != null &&
      i - lastOversoldExit <= 8 &&
      goldenCross(prev, cur)
    ) {
      hits.push(
        hit(
          "macd_rsi_confirm",
          i,
          bars,
          "bullish",
          "RSI 과매도 탈출 후 MACD 골든",
        ),
      );
      lastOversoldExit = null;
    } else if (
      lastOverboughtExit != null &&
      i - lastOverboughtExit <= 8 &&
      deadCross(prev, cur)
    ) {
      hits.push(
        hit(
          "macd_rsi_confirm",
          i,
          bars,
          "bearish",
          "RSI 과매수 이탈 후 MACD 데드",
        ),
      );
      lastOverboughtExit = null;
    }
  }
  return hits;
}

function detectDivergence(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): MacdStrategyHit[] {
  const hits: MacdStrategyHit[] = [];
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
    if (bars[b]!.low < bars[a]!.low && fb.macd > fa.macd) {
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
    if (bars[b]!.high > bars[a]!.high && fb.macd < fa.macd) {
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
          "macd_divergence",
          i,
          bars,
          "bullish",
          "상승 다이버전스 후 MACD 골든",
        ),
      );
    } else if (bearDiv && deadCross(prev, cur)) {
      hits.push(
        hit(
          "macd_divergence",
          i,
          bars,
          "bearish",
          "하락 다이버전스 후 MACD 데드",
        ),
      );
    }
  }
  return hits;
}

function detectTrendBreak(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): MacdStrategyHit[] {
  const hits: MacdStrategyHit[] = [];
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = Math.max(3, start - 40); i < bars.length - 2; i++) {
    if (localHigh(bars, i)) swingHighs.push(i);
    if (localLow(bars, i)) swingLows.push(i);
  }

  for (let i = Math.max(start, 5); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;

    const highs = swingHighs.filter((h) => h < i && h >= i - 40);
    if (highs.length >= 2) {
      const h1 = highs[highs.length - 2]!;
      const h2 = highs[highs.length - 1]!;
      if (bars[h2]!.high < bars[h1]!.high && h2 > h1) {
        const t = (i - h1) / (h2 - h1);
        const resist =
          bars[h1]!.high + t * (bars[h2]!.high - bars[h1]!.high);
        const macdResist =
          (frames[h1]?.macd ?? 0) +
          t * ((frames[h2]?.macd ?? 0) - (frames[h1]?.macd ?? 0));
        const sigResist =
          (frames[h1]?.signal ?? 0) +
          t * ((frames[h2]?.signal ?? 0) - (frames[h1]?.signal ?? 0));
        if (
          bars[i - 1]!.close <= resist &&
          bars[i]!.close > resist &&
          cur.macd > macdResist &&
          cur.signal > sigResist &&
          (goldenCross(prev, cur) || cur.macd > cur.signal)
        ) {
          hits.push(
            hit(
              "macd_trend_break",
              i,
              bars,
              "bullish",
              "가격·MACD·시그널 하락 추세 상향 돌파",
            ),
          );
        }
      }
    }

    const lows = swingLows.filter((l) => l < i && l >= i - 40);
    if (lows.length >= 2) {
      const l1 = lows[lows.length - 2]!;
      const l2 = lows[lows.length - 1]!;
      if (bars[l2]!.low > bars[l1]!.low && l2 > l1) {
        const t = (i - l1) / (l2 - l1);
        const support =
          bars[l1]!.low + t * (bars[l2]!.low - bars[l1]!.low);
        const macdSup =
          (frames[l1]?.macd ?? 0) +
          t * ((frames[l2]?.macd ?? 0) - (frames[l1]?.macd ?? 0));
        const sigSup =
          (frames[l1]?.signal ?? 0) +
          t * ((frames[l2]?.signal ?? 0) - (frames[l1]?.signal ?? 0));
        if (
          bars[i - 1]!.close >= support &&
          bars[i]!.close < support &&
          cur.macd < macdSup &&
          cur.signal < sigSup &&
          (deadCross(prev, cur) || cur.macd < cur.signal)
        ) {
          hits.push(
            hit(
              "macd_trend_break",
              i,
              bars,
              "bearish",
              "가격·MACD·시그널 상승 추세 하향 돌파",
            ),
          );
        }
      }
    }
  }
  return hits;
}

function capPerStrategy(hits: MacdStrategyHit[]): MacdStrategyHit[] {
  const counts = new Map<MacdStrategyId, number>();
  const out: MacdStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function detectMacdStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  options?: { lookbackBars?: number },
): MacdStrategyResult | null {
  const macdOut = indicators.indicators.macd;
  if (!macdOut?.series.macd?.length) return null;

  const macd = mapSeries(macdOut.series.macd);
  const signal = mapSeries(macdOut.series.macdSignal);
  const hist = mapSeries(macdOut.series.macdHist);
  const rsi = mapSeries(indicators.indicators.rsi?.series.rsi);

  const frames: Array<Frame | null> = bars.map((bar) => {
    const m = macd.get(bar.date);
    const s = signal.get(bar.date);
    const h = hist.get(bar.date);
    if (m == null || s == null || h == null) return null;
    return {
      macd: m,
      signal: s,
      hist: h,
      rsi: rsi.get(bar.date) ?? null,
    };
  });

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const all = [
    ...detectSignalCross(bars, frames, start),
    ...detectZeroLine(bars, frames, start),
    ...detectRsiConfirm(bars, frames, start),
    ...detectDivergence(bars, frames, start),
    ...detectTrendBreak(bars, frames, start),
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
    signals: inWindow,
    stats,
  };
}
