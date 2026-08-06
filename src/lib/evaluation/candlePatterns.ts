import type { OHLCVBar, TrendLabel } from "../types";
import patternConfig from "../../../config/candle-patterns.json";
import { patternLabel } from "../candlePatternMeta";
import { InsufficientDataError } from "../errors";
import { requireMinBars, requireNonEmptyArray } from "../require";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type CandlePatternId =
  | "doji"
  | "dragonfly_doji"
  | "gravestone_doji"
  | "spinning_top"
  | "hammer"
  | "inverted_hammer"
  | "shooting_star"
  | "hanging_man"
  | "bullish_engulfing"
  | "bearish_engulfing"
  | "bullish_harami"
  | "bearish_harami"
  | "piercing"
  | "dark_cloud_cover"
  | "tweezers_bottom"
  | "tweezers_top"
  | "bullish_marubozu"
  | "bearish_marubozu"
  | "bullish_kicker"
  | "bearish_kicker"
  | "morning_star"
  | "evening_star"
  | "three_white_soldiers"
  | "three_black_crows"
  | "rising_three_methods"
  | "falling_three_methods";

export interface CandlePatternHit {
  id: CandlePatternId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
}

export interface CandlePatternResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: CandlePatternHit[];
  recent: CandlePatternHit[];
  stats: SignalStatsMap;
}

interface BarMetrics {
  body: number;
  range: number;
  upperShadow: number;
  lowerShadow: number;
  bullish: boolean;
  bearish: boolean;
  bodyRangeRatio: number;
}

const LABELS: Record<CandlePatternId, string> = {
  doji: patternLabel("doji"),
  dragonfly_doji: patternLabel("dragonfly_doji"),
  gravestone_doji: patternLabel("gravestone_doji"),
  spinning_top: patternLabel("spinning_top"),
  hammer: patternLabel("hammer"),
  inverted_hammer: patternLabel("inverted_hammer"),
  shooting_star: patternLabel("shooting_star"),
  hanging_man: patternLabel("hanging_man"),
  bullish_engulfing: patternLabel("bullish_engulfing"),
  bearish_engulfing: patternLabel("bearish_engulfing"),
  bullish_harami: patternLabel("bullish_harami"),
  bearish_harami: patternLabel("bearish_harami"),
  piercing: patternLabel("piercing"),
  dark_cloud_cover: patternLabel("dark_cloud_cover"),
  tweezers_bottom: patternLabel("tweezers_bottom"),
  tweezers_top: patternLabel("tweezers_top"),
  bullish_marubozu: patternLabel("bullish_marubozu"),
  bearish_marubozu: patternLabel("bearish_marubozu"),
  bullish_kicker: patternLabel("bullish_kicker"),
  bearish_kicker: patternLabel("bearish_kicker"),
  morning_star: patternLabel("morning_star"),
  evening_star: patternLabel("evening_star"),
  three_white_soldiers: patternLabel("three_white_soldiers"),
  three_black_crows: patternLabel("three_black_crows"),
  rising_three_methods: patternLabel("rising_three_methods"),
  falling_three_methods: patternLabel("falling_three_methods"),
};

function metrics(bar: OHLCVBar): BarMetrics {
  const range = bar.high - bar.low;
  if (range <= 0) {
    throw new InsufficientDataError(
      `Invalid bar range=0 on ${bar.date} (high/low equal)`,
    );
  }
  const body = Math.abs(bar.close - bar.open);
  const top = Math.max(bar.open, bar.close);
  const bottom = Math.min(bar.open, bar.close);
  return {
    body,
    range,
    upperShadow: bar.high - top,
    lowerShadow: bottom - bar.low,
    bullish: bar.close > bar.open,
    bearish: bar.close < bar.open,
    bodyRangeRatio: body / range,
  };
}

function cfg() {
  return patternConfig;
}

function scanStartIndex(barsLength: number, lookback?: number | null): number {
  if (lookback == null || lookback <= 0) return 2;
  return Math.max(2, barsLength - lookback);
}

function hit(
  id: CandlePatternId,
  date: string,
  barIndex: number,
  direction: TrendLabel,
): CandlePatternHit {
  return { id, label: LABELS[id], date, barIndex, direction };
}

function isDoji(m: BarMetrics, c: typeof patternConfig): boolean {
  return m.bodyRangeRatio <= c.dojiMaxBodyRangeRatio;
}

/** Doji with long lower shadow, little upper — dragonfly. */
function isDragonflyDoji(m: BarMetrics, c: typeof patternConfig): boolean {
  if (!isDoji(m, c) || m.range <= 0) return false;
  return (
    m.lowerShadow / m.range >= c.dragonflyMinLowerShadowRangeRatio &&
    m.upperShadow / m.range <= c.dragonflyMaxUpperShadowRangeRatio
  );
}

/** Doji with long upper shadow, little lower — gravestone. */
function isGravestoneDoji(m: BarMetrics, c: typeof patternConfig): boolean {
  if (!isDoji(m, c) || m.range <= 0) return false;
  return (
    m.upperShadow / m.range >= c.gravestoneMinUpperShadowRangeRatio &&
    m.lowerShadow / m.range <= c.gravestoneMaxLowerShadowRangeRatio
  );
}

function isSpinningTop(m: BarMetrics, c: typeof patternConfig): boolean {
  if (m.body === 0) return false;
  if (m.bodyRangeRatio <= c.dojiMaxBodyRangeRatio) return false;
  return (
    m.bodyRangeRatio <= c.spinningTopMaxBodyRangeRatio &&
    m.upperShadow >= m.body * c.spinningTopMinShadowToBody &&
    m.lowerShadow >= m.body * c.spinningTopMinShadowToBody
  );
}

function isHammerShape(m: BarMetrics, c: typeof patternConfig): boolean {
  if (m.body === 0) return false;
  return (
    m.bodyRangeRatio <= c.hammerMaxBodyRangeRatio &&
    m.lowerShadow >= m.body * c.hammerMinLowerShadowToBody &&
    m.upperShadow <= m.body * c.hammerMaxUpperShadowToBody
  );
}

function isInvertedHammerShape(m: BarMetrics, c: typeof patternConfig): boolean {
  if (m.body === 0) return false;
  return (
    m.bodyRangeRatio <= c.hammerMaxBodyRangeRatio &&
    m.upperShadow >= m.body * c.shootingStarMinUpperShadowToBody &&
    m.lowerShadow <= m.body * c.shootingStarMaxLowerShadowToBody
  );
}

function isMarubozu(m: BarMetrics, c: typeof patternConfig): boolean {
  if (m.body === 0) return false;
  return (
    m.bodyRangeRatio >= c.marubozuMinBodyRangeRatio &&
    m.upperShadow <= m.body * c.marubozuMaxShadowToBody &&
    m.lowerShadow <= m.body * c.marubozuMaxShadowToBody
  );
}

function nearlyEqual(a: number, b: number, rel: number): boolean {
  const mid = (Math.abs(a) + Math.abs(b)) / 2;
  if (mid === 0) return a === b;
  return Math.abs(a - b) / mid <= rel;
}

function priorTrend(bars: OHLCVBar[], idx: number, periods = 3): TrendLabel {
  if (idx < periods) return "neutral";
  let up = 0;
  let down = 0;
  for (let i = idx - periods; i < idx; i++) {
    if (bars[i].close > bars[i].open) up++;
    else if (bars[i].close < bars[i].open) down++;
  }
  if (up >= periods - 1) return "bullish";
  if (down >= periods - 1) return "bearish";
  return "neutral";
}

function bodyMid(bar: OHLCVBar): number {
  return (bar.open + bar.close) / 2;
}

function bodyBottom(bar: OHLCVBar): number {
  return Math.min(bar.open, bar.close);
}

function bodyTop(bar: OHLCVBar): number {
  return Math.max(bar.open, bar.close);
}

function tryThreeMethods(
  bars: OHLCVBar[],
  idx: number,
  direction: "bullish" | "bearish",
  c: typeof patternConfig,
): boolean {
  const maxN = c.threeMethodsMaxCounterBars;
  const minN = c.threeMethodsMinCounterBars;
  for (let n = maxN; n >= minN; n--) {
    const firstIdx = idx - n - 1;
    if (firstIdx < 0) continue;
    const first = bars[firstIdx];
    const last = bars[idx];
    const fm = metrics(first);
    const lm = metrics(last);

    if (direction === "bullish") {
      if (!fm.bullish || !lm.bullish) continue;
      if (last.close <= first.close) continue;
    } else {
      if (!fm.bearish || !lm.bearish) continue;
      if (last.close >= first.close) continue;
    }

    if (fm.bodyRangeRatio < c.threeMethodsMinOuterBodyRangeRatio) continue;
    if (lm.bodyRangeRatio < c.threeMethodsMinOuterBodyRangeRatio) continue;

    let countersOk = true;
    for (let j = 1; j <= n; j++) {
      const mid = bars[firstIdx + j];
      const mm = metrics(mid);
      if (mm.bodyRangeRatio > c.threeMethodsMaxCounterBodyRangeRatio) {
        countersOk = false;
        break;
      }
      const top = bodyTop(mid);
      const bot = bodyBottom(mid);
      // Lenient: counter bodies stay inside the first bar's high–low range.
      if (top > first.high || bot < first.low) {
        countersOk = false;
        break;
      }
    }
    if (countersOk) return true;
  }
  return false;
}

function detectAtIndex(bars: OHLCVBar[], idx: number): CandlePatternHit[] {
  const c = cfg();
  const bar = bars[idx];
  const m = metrics(bar);
  const found: CandlePatternHit[] = [];
  const trend = priorTrend(bars, idx);

  if (isDragonflyDoji(m, c)) {
    found.push(hit("dragonfly_doji", bar.date, idx, "bullish"));
  } else if (isGravestoneDoji(m, c)) {
    found.push(hit("gravestone_doji", bar.date, idx, "bearish"));
  } else if (isDoji(m, c)) {
    found.push(hit("doji", bar.date, idx, "neutral"));
  } else if (isSpinningTop(m, c)) {
    found.push(hit("spinning_top", bar.date, idx, "neutral"));
  }

  if (isHammerShape(m, c)) {
    if (trend === "bearish") {
      found.push(hit("hammer", bar.date, idx, "bullish"));
    } else if (trend === "bullish") {
      found.push(hit("hanging_man", bar.date, idx, "bearish"));
    } else {
      found.push(hit("hammer", bar.date, idx, "bullish"));
    }
  }

  if (isInvertedHammerShape(m, c)) {
    if (trend === "bearish") {
      found.push(hit("inverted_hammer", bar.date, idx, "bullish"));
    } else if (trend === "bullish") {
      found.push(hit("shooting_star", bar.date, idx, "bearish"));
    } else {
      found.push(hit("shooting_star", bar.date, idx, "bearish"));
    }
  }

  if (isMarubozu(m, c)) {
    if (m.bullish) {
      found.push(hit("bullish_marubozu", bar.date, idx, "bullish"));
    } else if (m.bearish) {
      found.push(hit("bearish_marubozu", bar.date, idx, "bearish"));
    }
  }

  if (idx >= 1) {
    const prev = bars[idx - 1];
    const pm = metrics(prev);

    if (
      pm.bearish &&
      m.bullish &&
      bar.open <= prev.close &&
      bar.close >= prev.open &&
      m.body >= pm.body &&
      m.bodyRangeRatio >= c.engulfingMinBodyRangeRatio
    ) {
      found.push(hit("bullish_engulfing", bar.date, idx, "bullish"));
    }

    if (
      pm.bullish &&
      m.bearish &&
      bar.open >= prev.close &&
      bar.close <= prev.open &&
      m.body >= pm.body &&
      m.bodyRangeRatio >= c.engulfingMinBodyRangeRatio
    ) {
      found.push(hit("bearish_engulfing", bar.date, idx, "bearish"));
    }

    const prevTop = bodyTop(prev);
    const prevBottom = bodyBottom(prev);
    const curTop = bodyTop(bar);
    const curBottom = bodyBottom(bar);
    const prevBody = Math.abs(prev.close - prev.open);

    if (
      pm.bearish &&
      m.bullish &&
      curTop <= prevTop &&
      curBottom >= prevBottom &&
      m.body < pm.body
    ) {
      found.push(hit("bullish_harami", bar.date, idx, "bullish"));
    }

    if (
      pm.bullish &&
      m.bearish &&
      curTop <= prevTop &&
      curBottom >= prevBottom &&
      m.body < pm.body
    ) {
      found.push(hit("bearish_harami", bar.date, idx, "bearish"));
    }

    // Piercing: bullish recovery into prior bearish body (not full engulf).
    if (
      pm.bearish &&
      m.bullish &&
      prevBody > 0 &&
      bar.open <= prev.close &&
      bar.close >= prevBottom + prevBody * c.piercingMinCloseIntoPrevBody &&
      bar.close < prev.open
    ) {
      found.push(hit("piercing", bar.date, idx, "bullish"));
    }

    // Dark cloud: bearish push into prior bullish body (not full engulf).
    if (
      pm.bullish &&
      m.bearish &&
      prevBody > 0 &&
      bar.open >= prev.close &&
      bar.close <= prevTop - prevBody * c.piercingMinCloseIntoPrevBody &&
      bar.close > prev.open
    ) {
      found.push(hit("dark_cloud_cover", bar.date, idx, "bearish"));
    }

    if (nearlyEqual(bar.low, prev.low, c.tweezersMaxRelativeDiff)) {
      found.push(hit("tweezers_bottom", bar.date, idx, "bullish"));
    }
    if (nearlyEqual(bar.high, prev.high, c.tweezersMaxRelativeDiff)) {
      found.push(hit("tweezers_top", bar.date, idx, "bearish"));
    }

    // Kicker: opposite color after open gaps past prior open (standard; volume = companion).
    if (
      pm.bearish &&
      m.bullish &&
      pm.bodyRangeRatio >= c.kickerMinBodyRangeRatio &&
      m.bodyRangeRatio >= c.kickerMinBodyRangeRatio &&
      bar.open > prev.open
    ) {
      found.push(hit("bullish_kicker", bar.date, idx, "bullish"));
    }
    if (
      pm.bullish &&
      m.bearish &&
      pm.bodyRangeRatio >= c.kickerMinBodyRangeRatio &&
      m.bodyRangeRatio >= c.kickerMinBodyRangeRatio &&
      bar.open < prev.open
    ) {
      found.push(hit("bearish_kicker", bar.date, idx, "bearish"));
    }
  }

  if (idx >= 2) {
    const first = bars[idx - 2];
    const mid = bars[idx - 1];
    const fm = metrics(first);
    const mm = metrics(mid);

    if (
      fm.bearish &&
      fm.bodyRangeRatio >= c.starMinOuterBodyRangeRatio &&
      mm.bodyRangeRatio <= c.starMaxMidBodyRangeRatio &&
      m.bullish &&
      m.bodyRangeRatio >= c.starMinOuterBodyRangeRatio &&
      bar.close >= bodyMid(first)
    ) {
      found.push(hit("morning_star", bar.date, idx, "bullish"));
    }

    if (
      fm.bullish &&
      fm.bodyRangeRatio >= c.starMinOuterBodyRangeRatio &&
      mm.bodyRangeRatio <= c.starMaxMidBodyRangeRatio &&
      m.bearish &&
      m.bodyRangeRatio >= c.starMinOuterBodyRangeRatio &&
      bar.close <= bodyMid(first)
    ) {
      found.push(hit("evening_star", bar.date, idx, "bearish"));
    }

    const a = first;
    const b = mid;
    const d = bar;
    const am = fm;
    const bm = mm;
    const dm = m;

    if (
      am.bullish &&
      bm.bullish &&
      dm.bullish &&
      am.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      bm.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      dm.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      b.close > a.close &&
      d.close > b.close &&
      b.open >= Math.min(a.open, a.close) &&
      b.open <= Math.max(a.open, a.close) &&
      d.open >= Math.min(b.open, b.close) &&
      d.open <= Math.max(b.open, b.close) &&
      am.upperShadow <= am.body * c.soldiersMaxOppositeShadowToBody &&
      bm.upperShadow <= bm.body * c.soldiersMaxOppositeShadowToBody &&
      dm.upperShadow <= dm.body * c.soldiersMaxOppositeShadowToBody
    ) {
      found.push(hit("three_white_soldiers", bar.date, idx, "bullish"));
    }

    if (
      am.bearish &&
      bm.bearish &&
      dm.bearish &&
      am.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      bm.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      dm.bodyRangeRatio >= c.soldiersMinBodyRangeRatio &&
      b.close < a.close &&
      d.close < b.close &&
      b.open <= Math.max(a.open, a.close) &&
      b.open >= Math.min(a.open, a.close) &&
      d.open <= Math.max(b.open, b.close) &&
      d.open >= Math.min(b.open, b.close) &&
      am.lowerShadow <= am.body * c.soldiersMaxOppositeShadowToBody &&
      bm.lowerShadow <= bm.body * c.soldiersMaxOppositeShadowToBody &&
      dm.lowerShadow <= dm.body * c.soldiersMaxOppositeShadowToBody
    ) {
      found.push(hit("three_black_crows", bar.date, idx, "bearish"));
    }
  }

  if (tryThreeMethods(bars, idx, "bullish", c)) {
    found.push(hit("rising_three_methods", bar.date, idx, "bullish"));
  }
  if (tryThreeMethods(bars, idx, "bearish", c)) {
    found.push(hit("falling_three_methods", bar.date, idx, "bearish"));
  }

  return found;
}

export function detectCandlePatterns(
  bars: OHLCVBar[],
  options?: { lookbackBars?: number | null },
): CandlePatternResult {
  requireNonEmptyArray(bars, "OHLCV bars for candle patterns");
  const lookback = options?.lookbackBars ?? null;
  requireMinBars(bars.length, 3, "candle pattern detection");

  const start = scanStartIndex(bars.length, lookback);
  const recent: CandlePatternHit[] = [];

  for (let i = start; i < bars.length; i++) {
    recent.push(...detectAtIndex(bars, i));
  }

  const lastIdx = bars.length - 1;
  const onLatestBar = recent.filter((p) => p.barIndex === lastIdx);
  const latestBar = bars[lastIdx];
  const stats = scoreSignalHits(bars, recent);

  return {
    lookbackBars: bars.length - start,
    latestBarDate: latestBar.date,
    onLatestBar,
    recent,
    stats,
  };
}
