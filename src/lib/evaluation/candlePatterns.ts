import type { OHLCVBar, TrendLabel } from "../types";
import patternConfig from "../../../config/candle-patterns.json";
import { patternLabel } from "../candlePatternMeta";
import { InsufficientDataError } from "../errors";
import { requireMinBars, requireNonEmptyArray } from "../require";

export type CandlePatternId =
  | "doji"
  | "hammer"
  | "inverted_hammer"
  | "shooting_star"
  | "hanging_man"
  | "bullish_engulfing"
  | "bearish_engulfing"
  | "bullish_harami"
  | "bearish_harami";

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
  hammer: patternLabel("hammer"),
  inverted_hammer: patternLabel("inverted_hammer"),
  shooting_star: patternLabel("shooting_star"),
  hanging_man: patternLabel("hanging_man"),
  bullish_engulfing: patternLabel("bullish_engulfing"),
  bearish_engulfing: patternLabel("bearish_engulfing"),
  bullish_harami: patternLabel("bullish_harami"),
  bearish_harami: patternLabel("bearish_harami"),
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
  if (lookback == null || lookback <= 0) return 1;
  return Math.max(1, barsLength - lookback);
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

function detectAtIndex(bars: OHLCVBar[], idx: number): CandlePatternHit[] {
  const c = cfg();
  const bar = bars[idx];
  const m = metrics(bar);
  const found: CandlePatternHit[] = [];
  const trend = priorTrend(bars, idx);

  if (isDoji(m, c)) {
    found.push(hit("doji", bar.date, idx, "neutral"));
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

    const prevTop = Math.max(prev.open, prev.close);
    const prevBottom = Math.min(prev.open, prev.close);
    const curTop = Math.max(bar.open, bar.close);
    const curBottom = Math.min(bar.open, bar.close);

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
  }

  return found;
}

export function detectCandlePatterns(
  bars: OHLCVBar[],
  options?: { lookbackBars?: number | null },
): CandlePatternResult {
  requireNonEmptyArray(bars, "OHLCV bars for candle patterns");
  const lookback = options?.lookbackBars ?? null;
  requireMinBars(bars.length, 2, "candle pattern detection");

  const start = scanStartIndex(bars.length, lookback);
  const recent: CandlePatternHit[] = [];

  for (let i = start; i < bars.length; i++) {
    recent.push(...detectAtIndex(bars, i));
  }

  const lastIdx = bars.length - 1;
  const onLatestBar = recent.filter((p) => p.barIndex === lastIdx);
  const latestBar = bars[lastIdx];

  return {
    lookbackBars: bars.length - start,
    latestBarDate: latestBar.date,
    onLatestBar,
    recent,
  };
}
