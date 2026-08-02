import { EMA, PSAR, SMA } from "technicalindicators";

import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  VOLUME_STRATEGY_META,
  type VolumeStrategyId,
} from "../volumeStrategyMeta";
import type { CandlePatternResult } from "./candlePatterns";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";
import {
  trendlinePriceAt,
  type TrendlineResult,
} from "./trendlines";

export type { VolumeStrategyId };

export interface VolumeStrategyHit {
  id: VolumeStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface VolumeStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: VolumeStrategyHit[];
  recent: VolumeStrategyHit[];
  /** Uncapped hits in lookback (backtest / confluence). */
  signals: VolumeStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;
const EMA_PERIOD = 60;
const VOL_MA_PERIOD = 20;
const FIGHT_WINDOW = 14;
/** Heatmap thresholds vs volume MA (TradingView-style defaults from curriculum). */
const HEAT_EXTRA_HIGH = 3;
const HEAT_HIGH = 1.5;
const HEAT_MEDIUM = 0.5;
/** Near-zero band for Volume Fight neutrality. */
const FIGHT_NEUTRAL = 0.05;

type HeatTier = "extra_high" | "high" | "medium" | "normal" | "low";

function hit(
  id: VolumeStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): VolumeStrategyHit {
  return {
    id,
    label: VOLUME_STRATEGY_META[id].labelKo,
    date: bars[barIndex].date,
    barIndex,
    direction,
    summary,
  };
}

function alignEnd(
  fullLen: number,
  values: number[],
): Array<number | null> {
  const out: Array<number | null> = Array(fullLen).fill(null);
  const pad = fullLen - values.length;
  for (let i = 0; i < values.length; i++) {
    out[pad + i] = values[i];
  }
  return out;
}

function heatTier(ratio: number | null): HeatTier | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  if (ratio >= HEAT_EXTRA_HIGH) return "extra_high";
  if (ratio >= HEAT_HIGH) return "high";
  if (ratio >= HEAT_MEDIUM) return "medium";
  if (ratio >= HEAT_MEDIUM * 0.5) return "normal";
  return "low";
}

function isMediumPlus(tier: HeatTier | null): boolean {
  return tier === "extra_high" || tier === "high" || tier === "medium";
}

function isStrongHeat(tier: HeatTier | null): boolean {
  return tier === "extra_high" || tier === "high";
}

function buildFrames(bars: OHLCVBar[]) {
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const volumes = bars.map((b) => b.volume);

  const ema60 = alignEnd(
    bars.length,
    EMA.calculate({ period: EMA_PERIOD, values: closes }),
  );
  const volMa = alignEnd(
    bars.length,
    SMA.calculate({ period: VOL_MA_PERIOD, values: volumes }),
  );
  const psar = alignEnd(
    bars.length,
    PSAR.calculate({
      high: highs,
      low: lows,
      step: 0.02,
      max: 0.2,
    }),
  );

  const signed: number[] = bars.map((b) =>
    b.close >= b.open ? b.volume : -b.volume,
  );
  const fight: Array<number | null> = bars.map((_, i) => {
    if (i + 1 < FIGHT_WINDOW) return null;
    let sum = 0;
    let abs = 0;
    for (let k = i - FIGHT_WINDOW + 1; k <= i; k++) {
      sum += signed[k];
      abs += Math.abs(signed[k]);
    }
    if (abs <= 0) return 0;
    return sum / abs;
  });

  return bars.map((bar, i) => {
    const ma = volMa[i];
    const ratio =
      ma != null && ma > 0 && Number.isFinite(bar.volume)
        ? bar.volume / ma
        : null;
    const tier = heatTier(ratio);
    const e = ema60[i];
    const p = psar[i];
    const f = fight[i];
    return {
      ema60: e,
      psar: p,
      volMa: ma,
      volRatio: ratio,
      heat: tier,
      fight: f,
      aboveEma: e != null ? bar.close > e : null,
      abovePsar: p != null ? bar.close > p : null,
    };
  });
}

type Frame = ReturnType<typeof buildFrames>[number];

function psarBuyFlip(frames: Frame[], i: number): boolean {
  if (i < 1) return false;
  const prev = frames[i - 1];
  const cur = frames[i];
  return prev.abovePsar === false && cur.abovePsar === true;
}

function psarSellFlip(frames: Frame[], i: number): boolean {
  if (i < 1) return false;
  const prev = frames[i - 1];
  const cur = frames[i];
  return prev.abovePsar === true && cur.abovePsar === false;
}

function fightBull(f: number | null): boolean {
  return f != null && f > FIGHT_NEUTRAL;
}

function fightBear(f: number | null): boolean {
  return f != null && f < -FIGHT_NEUTRAL;
}

function detectHeatmap(
  bars: OHLCVBar[],
  frames: Frame[],
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const fr = frames[i];
    if (fr.aboveEma == null || !isMediumPlus(fr.heat)) continue;
    if (psarBuyFlip(frames, i) && fr.aboveEma) {
      hits.push(
        hit(
          "heatmap_volume",
          i,
          bars,
          "bullish",
          `EMA60↑ + SAR 바이 + 히트맵 ${fr.heat} (${(fr.volRatio ?? 0).toFixed(2)}×)`,
        ),
      );
    }
    if (psarSellFlip(frames, i) && !fr.aboveEma) {
      hits.push(
        hit(
          "heatmap_volume",
          i,
          bars,
          "bearish",
          `EMA60↓ + SAR 셀 + 히트맵 ${fr.heat} (${(fr.volRatio ?? 0).toFixed(2)}×)`,
        ),
      );
    }
  }
  return hits;
}

function detectVolumeFight(
  bars: OHLCVBar[],
  frames: Frame[],
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const fr = frames[i];
    if (fr.aboveEma == null || fr.fight == null) continue;
    if (psarBuyFlip(frames, i) && fr.aboveEma && fightBull(fr.fight)) {
      hits.push(
        hit(
          "volume_fight",
          i,
          bars,
          "bullish",
          `EMA60↑ + SAR 바이 + 파이트 매수우위 (${fr.fight.toFixed(2)})`,
        ),
      );
    }
    if (psarSellFlip(frames, i) && !fr.aboveEma && fightBear(fr.fight)) {
      hits.push(
        hit(
          "volume_fight",
          i,
          bars,
          "bearish",
          `EMA60↓ + SAR 셀 + 파이트 매도우위 (${fr.fight.toFixed(2)})`,
        ),
      );
    }
  }
  return hits;
}

function detectVsa(
  bars: OHLCVBar[],
  frames: Frame[],
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const fr = frames[i];
    if (fr.aboveEma == null || fr.volMa == null) continue;
    const aboveVolMa = bars[i].volume > fr.volMa;
    if (!aboveVolMa || !isStrongHeat(fr.heat)) continue;
    if (psarBuyFlip(frames, i) && fr.aboveEma) {
      hits.push(
        hit(
          "vsa",
          i,
          bars,
          "bullish",
          `EMA60↑ + SAR 바이 + VSA 강거래량 (${fr.heat}, ${(fr.volRatio ?? 0).toFixed(2)}×)`,
        ),
      );
    }
    if (psarSellFlip(frames, i) && !fr.aboveEma) {
      hits.push(
        hit(
          "vsa",
          i,
          bars,
          "bearish",
          `EMA60↓ + SAR 셀 + VSA 강거래량 (${fr.heat}, ${(fr.volRatio ?? 0).toFixed(2)}×)`,
        ),
      );
    }
  }
  return hits;
}

function capPerStrategy(hits: VolumeStrategyHit[]): VolumeStrategyHit[] {
  const counts = new Map<VolumeStrategyId, number>();
  const out: VolumeStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function isHammerLike(bar: OHLCVBar): boolean {
  const body = Math.abs(bar.close - bar.open);
  const range = bar.high - bar.low;
  if (range <= 0) return false;
  const lowerWick = Math.min(bar.open, bar.close) - bar.low;
  return lowerWick >= body * 1.5 && lowerWick >= range * 0.45 && bar.close >= bar.open;
}

function isShootingStarLike(bar: OHLCVBar): boolean {
  const body = Math.abs(bar.close - bar.open);
  const range = bar.high - bar.low;
  if (range <= 0) return false;
  const upperWick = bar.high - Math.max(bar.open, bar.close);
  return upperWick >= body * 1.5 && upperWick >= range * 0.45 && bar.close <= bar.open;
}

function risingStructure(bars: OHLCVBar[], i: number, look = 5): boolean {
  if (i < look) return false;
  return bars[i].high > bars[i - look].high && bars[i].low > bars[i - look].low;
}

function fallingStructure(bars: OHLCVBar[], i: number, look = 5): boolean {
  if (i < look) return false;
  return bars[i].high < bars[i - look].high && bars[i].low < bars[i - look].low;
}

function detectVwapPullback(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const slopeN = 3;
  for (let i = Math.max(start, slopeN + 1); i < bars.length; i++) {
    const cur = vwap.get(bars[i].date);
    const prev = vwap.get(bars[i - slopeN].date);
    if (cur == null || prev == null || cur === 0) continue;
    const tol = Math.abs(cur) * 0.004;
    const touched =
      bars[i].low <= cur + tol && bars[i].high >= cur - tol;
    if (!touched) continue;
    const slopeUp = cur > prev;
    const slopeDown = cur < prev;

    if (
      slopeUp &&
      risingStructure(bars, i) &&
      bars[i].close >= cur &&
      (bars[i].close > bars[i].open || isHammerLike(bars[i]))
    ) {
      hits.push(
        hit(
          "vwap_pullback",
          i,
          bars,
          "bullish",
          `VWAP 우상향 지지 반등 (${cur.toFixed(2)})`,
        ),
      );
    }
    if (
      slopeDown &&
      fallingStructure(bars, i) &&
      bars[i].close <= cur &&
      (bars[i].close < bars[i].open || isShootingStarLike(bars[i]))
    ) {
      hits.push(
        hit(
          "vwap_pullback",
          i,
          bars,
          "bearish",
          `VWAP 우하향 저항 (${cur.toFixed(2)})`,
        ),
      );
    }
  }
  return hits;
}

function detectVwapBandReversal(
  bars: OHLCVBar[],
  upper: Map<string, number>,
  lower: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  // Skip early VWAP window noise (~ first 10 bars of series).
  const warm = Math.max(start, 10);
  for (let i = warm; i < bars.length; i++) {
    const u = upper.get(bars[i].date);
    const l = lower.get(bars[i].date);
    if (u == null || l == null) continue;
    // Reject closes still outside the band (trend riding) — want a turn back inside.
    if (
      bars[i].high >= u &&
      bars[i].close < bars[i].open &&
      bars[i].close <= u
    ) {
      hits.push(
        hit(
          "vwap_band_reversal",
          i,
          bars,
          "bearish",
          `상단 밴드 터치 음봉 (${u.toFixed(2)})`,
        ),
      );
    }
    if (
      bars[i].low <= l &&
      bars[i].close > bars[i].open &&
      bars[i].close >= l
    ) {
      hits.push(
        hit(
          "vwap_band_reversal",
          i,
          bars,
          "bullish",
          `하단 밴드 터치 양봉 (${l.toFixed(2)})`,
        ),
      );
    }
  }
  return hits;
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

function detectObvDivergence(
  bars: OHLCVBar[],
  obv: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  return detectSeriesDivergence(
    bars,
    obv,
    start,
    "obv_divergence",
    "가격 LL + OBV HL 상승 다이버전스",
    "가격 HH + OBV LH 하락 다이버전스",
  );
}

function detectSeriesDivergence(
  bars: OHLCVBar[],
  series: Map<string, number>,
  start: number,
  id: VolumeStrategyId,
  bullSummary: string,
  bearSummary: string,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];
  for (let i = Math.max(start, 3); i < bars.length - 2; i++) {
    if (series.has(bars[i].date) && localLow(bars, i)) pivotLows.push(i);
    if (series.has(bars[i].date) && localHigh(bars, i)) pivotHighs.push(i);
  }
  for (let p = 1; p < pivotLows.length; p++) {
    const a = pivotLows[p - 1]!;
    const b = pivotLows[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const oa = series.get(bars[a].date);
    const ob = series.get(bars[b].date);
    if (oa == null || ob == null) continue;
    if (bars[b].low < bars[a].low && ob > oa) {
      hits.push(hit(id, b, bars, "bullish", bullSummary));
    }
  }
  for (let p = 1; p < pivotHighs.length; p++) {
    const a = pivotHighs[p - 1]!;
    const b = pivotHighs[p]!;
    if (b - a < 3 || b - a > 40) continue;
    const oa = series.get(bars[a].date);
    const ob = series.get(bars[b].date);
    if (oa == null || ob == null) continue;
    if (bars[b].high > bars[a].high && ob < oa) {
      hits.push(hit(id, b, bars, "bearish", bearSummary));
    }
  }
  return hits;
}

function detectChaikinZero(
  bars: OHLCVBar[],
  chaikin: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const prev = chaikin.get(bars[i - 1].date);
    const cur = chaikin.get(bars[i].date);
    if (prev == null || cur == null) continue;
    if (prev <= 0 && cur > 0) {
      hits.push(
        hit("chaikin_zero", i, bars, "bullish", "Chaikin 0선 상향 돌파"),
      );
    }
    if (prev >= 0 && cur < 0) {
      hits.push(
        hit("chaikin_zero", i, bars, "bearish", "Chaikin 0선 하향 돌파"),
      );
    }
  }
  return hits;
}

function detectEomZero(
  bars: OHLCVBar[],
  eom: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const prev = eom.get(bars[i - 1].date);
    const cur = eom.get(bars[i].date);
    if (prev == null || cur == null) continue;
    if (prev <= 0 && cur > 0) {
      hits.push(hit("eom_zero", i, bars, "bullish", "EOM 0선 상향 돌파"));
    }
    if (prev >= 0 && cur < 0) {
      hits.push(hit("eom_zero", i, bars, "bearish", "EOM 0선 하향 돌파"));
    }
  }
  return hits;
}

/** Oversquare (shape=3) at swing high/low → distribution / accumulation. */
function detectEquivolumeOversquare(
  bars: OHLCVBar[],
  shape: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const OVERSQUARE = 3;
  for (let i = Math.max(start, 3); i < bars.length - 2; i++) {
    const s = shape.get(bars[i].date);
    if (s !== OVERSQUARE) continue;
    if (localHigh(bars, i)) {
      hits.push(
        hit(
          "equivolume_oversquare",
          i,
          bars,
          "bearish",
          "스윙 고점 뚱보형(과다 공급·하락 경계)",
        ),
      );
    }
    if (localLow(bars, i)) {
      hits.push(
        hit(
          "equivolume_oversquare",
          i,
          bars,
          "bullish",
          "스윙 저점 뚱보형(매집·상승 후보)",
        ),
      );
    }
  }
  return hits;
}

function detectObvKeltner(
  bars: OHLCVBar[],
  obv: Map<string, number>,
  upper: Map<string, number>,
  lower: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const slopeN = 3;
  for (let i = Math.max(start, slopeN); i < bars.length; i++) {
    const u = upper.get(bars[i].date);
    const l = lower.get(bars[i].date);
    const o0 = obv.get(bars[i - slopeN].date);
    const o1 = obv.get(bars[i].date);
    const prevU = upper.get(bars[i - 1].date);
    const prevL = lower.get(bars[i - 1].date);
    if (u == null || l == null || o0 == null || o1 == null) continue;
    const obvUp = o1 > o0;
    const obvDown = o1 < o0;
    // Breakout: previous close inside / at band, current close outside
    if (
      prevU != null &&
      bars[i - 1].close <= prevU &&
      bars[i].close > u &&
      obvUp
    ) {
      hits.push(
        hit(
          "obv_keltner",
          i,
          bars,
          "bullish",
          `켈트너 상단 돌파 + OBV↑`,
        ),
      );
    }
    if (
      prevL != null &&
      bars[i - 1].close >= prevL &&
      bars[i].close < l &&
      obvDown
    ) {
      hits.push(
        hit(
          "obv_keltner",
          i,
          bars,
          "bearish",
          `켈트너 하단 이탈 + OBV↓`,
        ),
      );
    }
  }
  return hits;
}

function detectObvFastThrust(
  bars: OHLCVBar[],
  obv: Map<string, number>,
  signal: Map<string, number>,
  energy: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const rangeN = 8;
  const minEnergy = 55;
  for (let i = Math.max(start, rangeN); i < bars.length; i++) {
    const e = energy.get(bars[i].date);
    const o = obv.get(bars[i].date);
    const s = signal.get(bars[i].date);
    if (e == null || o == null || s == null || e < minEnergy) continue;

    let hi = -Infinity;
    let lo = Infinity;
    for (let k = i - rangeN; k < i; k++) {
      hi = Math.max(hi, bars[k].high);
      lo = Math.min(lo, bars[k].low);
    }
    if (!(Number.isFinite(hi) && Number.isFinite(lo))) continue;

    if (o > s && bars[i].close > hi && bars[i].close > bars[i].open) {
      hits.push(
        hit(
          "obv_fast_thrust",
          i,
          bars,
          "bullish",
          `패스트 OBV 추력 롱 (에너지 ${e.toFixed(0)}%)`,
        ),
      );
    }
    if (o < s && bars[i].close < lo && bars[i].close < bars[i].open) {
      hits.push(
        hit(
          "obv_fast_thrust",
          i,
          bars,
          "bearish",
          `패스트 OBV 추력 숏 (에너지 ${e.toFixed(0)}%)`,
        ),
      );
    }
  }
  return hits;
}

function detectVwapSwitching(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const n = 5;
  for (let i = Math.max(start, n); i < bars.length; i++) {
    const v0 = vwap.get(bars[i - n].date);
    const v1 = vwap.get(bars[i].date);
    if (v0 == null || v1 == null) continue;
    const priceUp = bars[i].close > bars[i - n].close;
    const priceDown = bars[i].close < bars[i - n].close;
    const vwapUp = v1 > v0;
    const vwapDown = v1 < v0;
    const tol = Math.abs(v1) * 0.006;
    const nearVwap =
      bars[i].low <= v1 + tol && bars[i].high >= v1 - tol;

    // Price↑ VWAP↓ → short bias when near VWAP / rejection
    if (priceUp && vwapDown && nearVwap && bars[i].close < bars[i].open) {
      hits.push(
        hit(
          "vwap_switching",
          i,
          bars,
          "bearish",
          `스위칭: 가격↑·VWAP↓ → 숏 후보`,
        ),
      );
    }
    // Price↓ VWAP↑ → long bias on bounce
    if (
      priceDown &&
      vwapUp &&
      nearVwap &&
      (bars[i].close > bars[i].open || isHammerLike(bars[i]))
    ) {
      hits.push(
        hit(
          "vwap_switching",
          i,
          bars,
          "bullish",
          `스위칭: 가격↓·VWAP↑ → 롱 후보`,
        ),
      );
    }
  }
  return hits;
}

const SQUEEZE_GAP = 0.004;
const WIDE_GAP = 0.012;

function gapPct(a: number, b: number): number {
  if (a === 0) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / Math.abs(a);
}

function detectVwapEmaSqueeze(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  ema: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const slopeN = 3;
  for (let i = Math.max(start, slopeN + 1); i < bars.length; i++) {
    const v0 = vwap.get(bars[i - 1]!.date);
    const v1 = vwap.get(bars[i]!.date);
    const e0 = ema.get(bars[i - 1]!.date);
    const e1 = ema.get(bars[i]!.date);
    const vPrevSlope = vwap.get(bars[i - slopeN]!.date);
    if (v0 == null || v1 == null || e0 == null || e1 == null || vPrevSlope == null) {
      continue;
    }
    const gap = gapPct(v1, e1);
    const gap0 = gapPct(v0, e0);
    // Recently squeezed (now or prior bar), avoid already-wide spreads.
    const squeezed = gap <= SQUEEZE_GAP || gap0 <= SQUEEZE_GAP;
    if (!squeezed || gap >= WIDE_GAP) continue;

    const crossUp = e0 <= v0 && e1 > v1;
    const crossDown = e0 >= v0 && e1 < v1;
    const vwapUp = v1 > vPrevSlope;
    const vwapDown = v1 < vPrevSlope;
    const bar = bars[i]!;

    if (crossUp && vwapUp && bar.close >= v1) {
      hits.push(
        hit(
          "vwap_ema_squeeze",
          i,
          bars,
          "bullish",
          `스키즈 후 EMA↑VWAP 골든 (이격 ${(gap * 100).toFixed(2)}%)`,
        ),
      );
    }
    if (crossDown && vwapDown && bar.close <= v1) {
      hits.push(
        hit(
          "vwap_ema_squeeze",
          i,
          bars,
          "bearish",
          `스키즈 후 EMA↓VWAP 데드 (이격 ${(gap * 100).toFixed(2)}%)`,
        ),
      );
    }
  }
  return hits;
}

function detectVwapTrendline(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  trendlines: TrendlineResult | null | undefined,
  start: number,
): VolumeStrategyHit[] {
  if (!trendlines) return [];
  const hits: VolumeStrategyHit[] = [];
  const asc = [...trendlines.ascending].sort((a, b) => b.score - a.score);
  const desc = [...trendlines.descending].sort((a, b) => b.score - a.score);

  for (let i = Math.max(start, 2); i < bars.length; i++) {
    const v = vwap.get(bars[i]!.date);
    if (v == null || v === 0) continue;
    const bar = bars[i]!;
    const vTol = Math.abs(v) * 0.006;
    const nearVwap = bar.low <= v + vTol && bar.high >= v - vTol;
    if (!nearVwap) continue;

    for (const line of asc) {
      if (i < line.x2) continue;
      if (line.broken && line.breakBarIndex != null && line.breakBarIndex <= i) {
        continue;
      }
      const tl = trendlinePriceAt(line, i);
      if (tl <= 0) continue;
      const tlTol = Math.abs(tl) * 0.008;
      const nearTl = bar.low <= tl + tlTol && bar.high >= tl - tlTol;
      if (!nearTl) continue;
      if (bar.close >= v && (bar.close > bar.open || isHammerLike(bar))) {
        hits.push(
          hit(
            "vwap_trendline",
            i,
            bars,
            "bullish",
            `VWAP∩상승추세선 지지 (${v.toFixed(2)} / ${tl.toFixed(2)})`,
          ),
        );
        break;
      }
    }

    for (const line of desc) {
      if (i < line.x2) continue;
      if (line.broken && line.breakBarIndex != null && line.breakBarIndex <= i) {
        continue;
      }
      const tl = trendlinePriceAt(line, i);
      if (tl <= 0) continue;
      const tlTol = Math.abs(tl) * 0.008;
      const nearTl = bar.low <= tl + tlTol && bar.high >= tl - tlTol;
      if (!nearTl) continue;
      if (bar.close <= v && (bar.close < bar.open || isShootingStarLike(bar))) {
        hits.push(
          hit(
            "vwap_trendline",
            i,
            bars,
            "bearish",
            `VWAP∩하락추세선 저항 (${v.toFixed(2)} / ${tl.toFixed(2)})`,
          ),
        );
        break;
      }
    }
  }
  return hits;
}

function isStrongBody(bar: OHLCVBar, minBodyRatio = 0.55): boolean {
  const range = bar.high - bar.low;
  if (range <= 0) return false;
  return Math.abs(bar.close - bar.open) / range >= minBodyRatio;
}

function detectForeverVwapFlip(
  bars: OHLCVBar[],
  flip: Map<string, number>,
  vwap: Map<string, number>,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const f = flip.get(bars[i]!.date);
    if (f == null || f === 0) continue;
    const bar = bars[i]!;
    const v = vwap.get(bar.date);
    if (!isStrongBody(bar)) continue;

    if (f > 0 && bar.close > bar.open && (v == null || bar.close >= v)) {
      hits.push(
        hit(
          "forever_vwap_flip",
          i,
          bars,
          "bullish",
          `주황 다이아몬드 + 장대 양봉 종가 진입`,
        ),
      );
    }
    if (f < 0 && bar.close < bar.open && (v == null || bar.close <= v)) {
      hits.push(
        hit(
          "forever_vwap_flip",
          i,
          bars,
          "bearish",
          `보라 다이아몬드 + 장대 음봉 종가 진입/스위칭`,
        ),
      );
    }
  }
  return hits;
}

function hasUpperWickPressure(bars: OHLCVBar[], from: number, to: number): boolean {
  let n = 0;
  for (let i = from; i <= to; i++) {
    if (i < 0 || i >= bars.length) continue;
    const b = bars[i]!;
    const range = b.high - b.low;
    if (range <= 0) continue;
    const upper = b.high - Math.max(b.open, b.close);
    if (upper >= range * 0.35 || isShootingStarLike(b)) n += 1;
  }
  return n >= 2;
}

function isBearishEngulfingLocal(prev: OHLCVBar, cur: OHLCVBar): boolean {
  return (
    prev.close > prev.open &&
    cur.close < cur.open &&
    cur.open >= prev.close &&
    cur.close <= prev.open
  );
}

function detectFailedBreakoutShort(
  bars: OHLCVBar[],
  vwap: Map<string, number>,
  patterns: CandlePatternResult | null | undefined,
  start: number,
): VolumeStrategyHit[] {
  const hits: VolumeStrategyHit[] = [];
  const engulfDates = new Set(
    [...(patterns?.recent ?? []), ...(patterns?.onLatestBar ?? [])]
      .filter((p) => p.id === "bearish_engulfing")
      .map((p) => p.date),
  );

  for (let i = Math.max(start, 6); i < bars.length; i++) {
    const attempt = bars[i - 2]!;
    const engulf = bars[i - 1]!;
    const trigger = bars[i]!;
    if (attempt.close <= attempt.open) continue;

    const engulfOk =
      engulfDates.has(engulf.date) || isBearishEngulfingLocal(attempt, engulf);
    if (!engulfOk) continue;

    let priorHigh = -Infinity;
    for (let k = i - 10; k <= i - 3; k++) {
      if (k >= 0) priorHigh = Math.max(priorHigh, bars[k]!.high);
    }
    if (!Number.isFinite(priorHigh)) continue;
    if (attempt.high > priorHigh) continue; // made new high — not a failed breakout

    const vAttempt = vwap.get(attempt.date);
    if (vAttempt != null && attempt.high >= vAttempt) continue; // cleared VWAP

    if (!hasUpperWickPressure(bars, i - 5, i - 2)) continue;
    if (trigger.low > attempt.low && trigger.close >= attempt.low) continue;

    hits.push(
      hit(
        "failed_breakout_short",
        i,
        bars,
        "bearish",
        `실패돌파: 고점미갱신·VWAP미돌파·하락장형 후 저점 이탈`,
      ),
    );
  }
  return hits;
}

export function detectVolumeStrategies(
  bars: OHLCVBar[],
  indicators?: IndicatorResults,
  options?: {
    lookbackBars?: number;
    trendlines?: TrendlineResult | null;
    patterns?: CandlePatternResult | null;
  },
): VolumeStrategyResult | null {
  if (bars.length < Math.max(EMA_PERIOD, VOL_MA_PERIOD, FIGHT_WINDOW) + 2) {
    return null;
  }

  const frames = buildFrames(bars);
  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const vwapOut = indicators?.indicators.vwap;
  const vwap = mapSeries(vwapOut?.series.vwap);
  // Prefer outer band (×3) for reversal; fall back to ×2.
  const upper = mapSeries(
    vwapOut?.series.upper2?.length
      ? vwapOut.series.upper2
      : vwapOut?.series.upper1,
  );
  const lower = mapSeries(
    vwapOut?.series.lower2?.length
      ? vwapOut.series.lower2
      : vwapOut?.series.lower1,
  );
  const ema12 = mapSeries(indicators?.indicators.ema?.series["ema:12"]);
  const foreverOut = indicators?.indicators.forever_vwap;
  const foreverVwap = mapSeries(foreverOut?.series.vwap);
  const foreverFlip = mapSeries(foreverOut?.series.flip);

  const obvOut = indicators?.indicators.obv;
  const obv = mapSeries(obvOut?.series.obv);
  const obvSignal = mapSeries(obvOut?.series.obvSignal);
  const obvEnergy = mapSeries(obvOut?.series.energy);
  const kc = indicators?.indicators.keltner;
  const kcUpper = mapSeries(kc?.series.upper);
  const kcLower = mapSeries(kc?.series.lower);

  const ad = mapSeries(indicators?.indicators.ad?.series.ad);
  const chaikin = mapSeries(indicators?.indicators.chaikin?.series.chaikin);
  const eomSmooth = mapSeries(
    indicators?.indicators.eom?.series.eomSmooth?.length
      ? indicators.indicators.eom.series.eomSmooth
      : indicators?.indicators.eom?.series.eom,
  );
  const eqShape = mapSeries(indicators?.indicators.equivolume?.series.shape);

  const all = [
    ...detectHeatmap(bars, frames, start),
    ...detectVolumeFight(bars, frames, start),
    ...detectVsa(bars, frames, start),
    ...(vwap.size
      ? [
          ...detectVwapPullback(bars, vwap, start),
          ...detectVwapBandReversal(bars, upper, lower, start),
          ...detectVwapSwitching(bars, vwap, start),
          ...(ema12.size
            ? detectVwapEmaSqueeze(bars, vwap, ema12, start)
            : []),
          ...detectVwapTrendline(bars, vwap, options?.trendlines, start),
          ...detectFailedBreakoutShort(bars, vwap, options?.patterns, start),
        ]
      : []),
    ...(foreverFlip.size
      ? detectForeverVwapFlip(
          bars,
          foreverFlip,
          foreverVwap.size ? foreverVwap : vwap,
          start,
        )
      : []),
    ...(obv.size ? [...detectObvDivergence(bars, obv, start)] : []),
    ...(obv.size && kcUpper.size
      ? [...detectObvKeltner(bars, obv, kcUpper, kcLower, start)]
      : []),
    ...(obv.size && obvSignal.size && obvEnergy.size
      ? [...detectObvFastThrust(bars, obv, obvSignal, obvEnergy, start)]
      : []),
    ...(ad.size
      ? [
          ...detectSeriesDivergence(
            bars,
            ad,
            start,
            "ad_divergence",
            "가격 LL + A/D HL 매집 다이버전스",
            "가격 HH + A/D LH 분산 다이버전스",
          ),
        ]
      : []),
    ...(chaikin.size
      ? [
          ...detectChaikinZero(bars, chaikin, start),
          ...detectSeriesDivergence(
            bars,
            chaikin,
            start,
            "chaikin_divergence",
            "가격 LL + Chaikin HL 상승 다이버전스",
            "가격 HH + Chaikin LH 하락 다이버전스",
          ),
        ]
      : []),
    ...(eqShape.size
      ? [...detectEquivolumeOversquare(bars, eqShape, start)]
      : []),
    ...(eomSmooth.size ? [...detectEomZero(bars, eomSmooth, start)] : []),
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
