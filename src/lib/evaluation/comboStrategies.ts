import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  COMBO_STRATEGY_META,
  type ComboStrategyId,
} from "../comboStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { ComboStrategyId };

export interface ComboStrategyHit {
  id: ComboStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface ComboStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: ComboStrategyHit[];
  recent: ComboStrategyHit[];
  signals: ComboStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;
const ATR_SMA_N = 20;
const OBV_HH_N = 20;
const MFI_SLOPE_N = 3;

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: ComboStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): ComboStrategyHit {
  return {
    id,
    label: COMBO_STRATEGY_META[id].labelKo,
    date: bars[barIndex].date,
    barIndex,
    direction,
    summary,
  };
}

function capPerStrategy(hits: ComboStrategyHit[]): ComboStrategyHit[] {
  const counts = new Map<ComboStrategyId, number>();
  const out: ComboStrategyHit[] = [];
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i]!;
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.reverse();
}

function valAt(
  map: Map<string, number>,
  bars: OHLCVBar[],
  i: number,
): number | null {
  const v = map.get(bars[i]?.date ?? "");
  return v != null && Number.isFinite(v) ? v : null;
}

function atrRatioAt(
  atr: Map<string, number>,
  bars: OHLCVBar[],
  i: number,
): number | null {
  const cur = valAt(atr, bars, i);
  if (cur == null || i < ATR_SMA_N) return null;
  let sum = 0;
  let n = 0;
  for (let k = i - ATR_SMA_N + 1; k <= i; k++) {
    const a = valAt(atr, bars, k);
    if (a == null) continue;
    sum += a;
    n++;
  }
  if (n < ATR_SMA_N * 0.8 || sum <= 0) return null;
  return cur / (sum / n);
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

function detectStAdx(
  bars: OHLCVBar[],
  st: Map<string, number>,
  stDir: Map<string, number>,
  adx: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const a = valAt(adx, bars, i);
    const d0 = valAt(stDir, bars, i - 1);
    const d1 = valAt(stDir, bars, i);
    const line = valAt(st, bars, i);
    if (a == null || d0 == null || d1 == null || line == null) continue;
    if (a <= 25) continue;
    const close = bars[i]!.close;
    if (d0 <= 0 && d1 > 0 && close > line) {
      hits.push(
        hit(
          "st_adx",
          i,
          bars,
          "bullish",
          `ADX ${a.toFixed(1)} + ST 상승 전환 · 종가>ST`,
        ),
      );
    }
    if (d0 >= 0 && d1 < 0 && close < line) {
      hits.push(
        hit(
          "st_adx",
          i,
          bars,
          "bearish",
          `ADX ${a.toFixed(1)} + ST 하락 전환 · 종가<ST`,
        ),
      );
    }
  }
  return hits;
}

function detectKcCci(
  bars: OHLCVBar[],
  upper: Map<string, number>,
  lower: Map<string, number>,
  cci: Map<string, number>,
  atr: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const u = valAt(upper, bars, i);
    const l = valAt(lower, bars, i);
    const prevU = valAt(upper, bars, i - 1);
    const prevL = valAt(lower, bars, i - 1);
    const c0 = valAt(cci, bars, i - 1);
    const c1 = valAt(cci, bars, i);
    const ratio = atrRatioAt(atr, bars, i);
    if (
      u == null ||
      l == null ||
      prevU == null ||
      prevL == null ||
      c0 == null ||
      c1 == null ||
      ratio == null
    ) {
      continue;
    }
    // Volatility expansion filter
    if (ratio < 1.05) continue;

    const brokeUp = bars[i - 1]!.close <= prevU && bars[i]!.close > u;
    const brokeDown = bars[i - 1]!.close >= prevL && bars[i]!.close < l;
    const cciUp = c0 <= 100 && c1 > 100;
    const cciDown = c0 >= -100 && c1 < -100;

    if (brokeUp && cciUp) {
      hits.push(
        hit(
          "kc_cci",
          i,
          bars,
          "bullish",
          `켈트너 상단 돌파 + CCI>+100 · ATR×${ratio.toFixed(2)}`,
        ),
      );
    }
    if (brokeDown && cciDown) {
      hits.push(
        hit(
          "kc_cci",
          i,
          bars,
          "bearish",
          `켈트너 하단 이탈 + CCI<−100 · ATR×${ratio.toFixed(2)}`,
        ),
      );
    }
  }
  return hits;
}

function obvAtHigh(
  obv: Map<string, number>,
  bars: OHLCVBar[],
  i: number,
  n: number,
): boolean {
  const cur = valAt(obv, bars, i);
  if (cur == null || i < n) return false;
  for (let k = i - n; k < i; k++) {
    const o = valAt(obv, bars, k);
    if (o != null && o >= cur) return false;
  }
  return true;
}

function obvAtLow(
  obv: Map<string, number>,
  bars: OHLCVBar[],
  i: number,
  n: number,
): boolean {
  const cur = valAt(obv, bars, i);
  if (cur == null || i < n) return false;
  for (let k = i - n; k < i; k++) {
    const o = valAt(obv, bars, k);
    if (o != null && o <= cur) return false;
  }
  return true;
}

function detectVwapFlow(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  mfi: Map<string, number>,
  obv: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  for (let i = Math.max(start, MFI_SLOPE_N, OBV_HH_N); i < bars.length; i++) {
    const v = valAt(vwap, bars, i);
    const m0 = valAt(mfi, bars, i - MFI_SLOPE_N);
    const m1 = valAt(mfi, bars, i);
    if (v == null || m0 == null || m1 == null) continue;
    const tol = Math.abs(v) * 0.006;
    const bar = bars[i]!;
    const nearVwap = bar.low <= v + tol && bar.high >= v - tol;
    const mfiRising = m1 > m0;
    const mfiFalling = m1 < m0;

    if (
      nearVwap &&
      bar.close >= v &&
      bar.close > bar.open &&
      m1 > 50 &&
      mfiRising &&
      obvAtHigh(obv, bars, i, OBV_HH_N)
    ) {
      hits.push(
        hit(
          "vwap_flow",
          i,
          bars,
          "bullish",
          `VWAP 지지 + MFI ${m1.toFixed(0)}↑ + OBV 신고`,
        ),
      );
    }
    if (
      nearVwap &&
      bar.close <= v &&
      bar.close < bar.open &&
      m1 < 50 &&
      mfiFalling &&
      obvAtLow(obv, bars, i, OBV_HH_N)
    ) {
      hits.push(
        hit(
          "vwap_flow",
          i,
          bars,
          "bearish",
          `VWAP 저항 + MFI ${m1.toFixed(0)}↓ + OBV 신저`,
        ),
      );
    }
  }
  return hits;
}

function detectPctbMeanReversion(
  bars: OHLCVBar[],
  percentB: Map<string, number>,
  cci: Map<string, number>,
  atr: Map<string, number>,
  adx: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  for (let i = Math.max(start, ATR_SMA_N); i < bars.length; i++) {
    const pb = valAt(percentB, bars, i);
    const c = valAt(cci, bars, i);
    const a = valAt(adx, bars, i);
    const ratio = atrRatioAt(atr, bars, i);
    if (pb == null || c == null || a == null || ratio == null) continue;
    // Range / weak trend only; avoid sudden ATR spikes
    if (a >= 20 || ratio >= 1.3) continue;

    if (pb <= 0 && c <= -100) {
      hits.push(
        hit(
          "pctb_mean_reversion",
          i,
          bars,
          "bullish",
          `%B ${pb.toFixed(2)} + CCI ${c.toFixed(0)} · ADX ${a.toFixed(1)} 횡보`,
        ),
      );
    }
    if (pb >= 1 && c >= 100) {
      hits.push(
        hit(
          "pctb_mean_reversion",
          i,
          bars,
          "bearish",
          `%B ${pb.toFixed(2)} + CCI ${c.toFixed(0)} · ADX ${a.toFixed(1)} 횡보`,
        ),
      );
    }
  }
  return hits;
}

function detectPsarAdx(
  bars: OHLCVBar[],
  psar: Map<string, number>,
  adx: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const a = valAt(adx, bars, i);
    const p0 = valAt(psar, bars, i - 1);
    const p1 = valAt(psar, bars, i);
    if (a == null || p0 == null || p1 == null || a <= 20) continue;
    const prevAbove = bars[i - 1]!.close > p0;
    const curAbove = bars[i]!.close > p1;
    if (!prevAbove && curAbove) {
      hits.push(
        hit(
          "psar_adx",
          i,
          bars,
          "bullish",
          `ADX ${a.toFixed(1)} + SAR 바이 플립`,
        ),
      );
    }
    if (prevAbove && !curAbove) {
      hits.push(
        hit(
          "psar_adx",
          i,
          bars,
          "bearish",
          `ADX ${a.toFixed(1)} + SAR 셀 플립`,
        ),
      );
    }
  }
  return hits;
}

function mfiBullDivNear(
  bars: OHLCVBar[],
  mfi: Map<string, number>,
  lowA: number,
  lowB: number,
): boolean {
  const ma = valAt(mfi, bars, lowA);
  const mb = valAt(mfi, bars, lowB);
  if (ma == null || mb == null) return false;
  return bars[lowB]!.low < bars[lowA]!.low && mb > ma;
}

function mfiBearDivNear(
  bars: OHLCVBar[],
  mfi: Map<string, number>,
  highA: number,
  highB: number,
): boolean {
  const ma = valAt(mfi, bars, highA);
  const mb = valAt(mfi, bars, highB);
  if (ma == null || mb == null) return false;
  return bars[highB]!.high > bars[highA]!.high && mb < ma;
}

function detectObvDivSt(
  bars: OHLCVBar[],
  obv: Map<string, number>,
  stDir: Map<string, number>,
  mfi: Map<string, number>,
  start: number,
): ComboStrategyHit[] {
  const hits: ComboStrategyHit[] = [];
  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];
  for (let i = Math.max(start, 3); i < bars.length - 2; i++) {
    if (valAt(obv, bars, i) != null && localLow(bars, i)) pivotLows.push(i);
    if (valAt(obv, bars, i) != null && localHigh(bars, i)) pivotHighs.push(i);
  }

  // Pending divergence pivots → confirm on ST flip within next few bars
  for (let p = 1; p < pivotLows.length; p++) {
    const a = pivotLows[p - 1]!;
    const b = pivotLows[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const oa = valAt(obv, bars, a);
    const ob = valAt(obv, bars, b);
    if (oa == null || ob == null) continue;
    if (!(bars[b]!.low < bars[a]!.low && ob > oa)) continue;
    const mfiOk = mfiBullDivNear(bars, mfi, a, b);
    const end = Math.min(bars.length - 1, b + 8);
    for (let i = b; i <= end; i++) {
      if (i < start) continue;
      const d0 = i > 0 ? valAt(stDir, bars, i - 1) : null;
      const d1 = valAt(stDir, bars, i);
      if (d0 == null || d1 == null) continue;
      if (d0 <= 0 && d1 > 0) {
        hits.push(
          hit(
            "obv_div_st",
            i,
            bars,
            "bullish",
            mfiOk
              ? "OBV 상승 다이버전스 + ST 전환 · MFI 확인"
              : "OBV 상승 다이버전스 + ST 상승 전환",
          ),
        );
        break;
      }
    }
  }

  for (let p = 1; p < pivotHighs.length; p++) {
    const a = pivotHighs[p - 1]!;
    const b = pivotHighs[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const oa = valAt(obv, bars, a);
    const ob = valAt(obv, bars, b);
    if (oa == null || ob == null) continue;
    if (!(bars[b]!.high > bars[a]!.high && ob < oa)) continue;
    const mfiOk = mfiBearDivNear(bars, mfi, a, b);
    const end = Math.min(bars.length - 1, b + 8);
    for (let i = b; i <= end; i++) {
      if (i < start) continue;
      const d0 = i > 0 ? valAt(stDir, bars, i - 1) : null;
      const d1 = valAt(stDir, bars, i);
      if (d0 == null || d1 == null) continue;
      if (d0 >= 0 && d1 < 0) {
        hits.push(
          hit(
            "obv_div_st",
            i,
            bars,
            "bearish",
            mfiOk
              ? "OBV 하락 다이버전스 + ST 전환 · MFI 확인"
              : "OBV 하락 다이버전스 + ST 하락 전환",
          ),
        );
        break;
      }
    }
  }
  return hits;
}

export function detectComboStrategies(
  bars: OHLCVBar[],
  indicators?: IndicatorResults,
  options?: { lookbackBars?: number },
): ComboStrategyResult | null {
  if (!indicators || bars.length < 40) return null;

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const stOut = indicators.indicators.supertrend;
  const st = mapSeries(stOut?.series.supertrend);
  const stDir = mapSeries(stOut?.series.direction);
  const adx = mapSeries(indicators.indicators.adx?.series.adx);
  const atr = mapSeries(indicators.indicators.atr?.series.atr);
  const cci = mapSeries(indicators.indicators.cci?.series.cci);
  const kc = indicators.indicators.keltner;
  const kcUpper = mapSeries(kc?.series.upper);
  const kcLower = mapSeries(kc?.series.lower);
  const vwap = mapSeries(indicators.indicators.vwap?.series.vwap);
  const mfi = mapSeries(indicators.indicators.mfi?.series.mfi);
  const obv = mapSeries(indicators.indicators.obv?.series.obv);
  const percentB = mapSeries(indicators.indicators.bb?.series.bbPercentB);
  const psar = mapSeries(indicators.indicators.psar?.series.psar);

  const all: ComboStrategyHit[] = [];

  if (st.size && stDir.size && adx.size) {
    all.push(...detectStAdx(bars, st, stDir, adx, start));
  }
  if (kcUpper.size && kcLower.size && cci.size && atr.size) {
    all.push(...detectKcCci(bars, kcUpper, kcLower, cci, atr, start));
  }
  if (vwap.size && mfi.size && obv.size) {
    all.push(...detectVwapFlow(bars, vwap, mfi, obv, start));
  }
  if (percentB.size && cci.size && atr.size && adx.size) {
    all.push(
      ...detectPctbMeanReversion(bars, percentB, cci, atr, adx, start),
    );
  }
  if (psar.size && adx.size) {
    all.push(...detectPsarAdx(bars, psar, adx, start));
  }
  if (obv.size && stDir.size) {
    all.push(...detectObvDivSt(bars, obv, stDir, mfi, start));
  }

  const inWindow = all.filter((h) => h.barIndex >= start);
  // Deduplicate identical id+bar+direction (e.g. overlapping confirm loops)
  const seen = new Set<string>();
  const deduped: ComboStrategyHit[] = [];
  for (const h of inWindow) {
    const key = `${h.id}|${h.barIndex}|${h.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
  }

  const stats = scoreSignalHits(bars, deduped);
  const recent = capPerStrategy(deduped);
  const lastIdx = bars.length - 1;
  const onLatestBar = recent.filter((h) => h.barIndex === lastIdx);

  return {
    lookbackBars: lookback,
    latestBarDate: bars[lastIdx]?.date ?? "",
    onLatestBar,
    recent,
    signals: deduped,
    stats,
  };
}
