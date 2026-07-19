import { SMA, EMA, RSI, MACD, BollingerBands } from "technicalindicators";
import type { OHLCVBar, ScoreBreakdown, ScoreResult } from "../types";
import type { IndicatorResults } from "../types";
import { getEffectiveScoringConfig } from "../configStore";
import { ConfigError, InsufficientDataError } from "../errors";
import { requireDefined, requireNonEmptyArray, requireNumber } from "../require";

/** Scoring computes its own series — not tied to chart indicator toggles/periods. */
function latestSma(bars: OHLCVBar[], period: number): number | null {
  if (bars.length < period) return null;
  const vals = SMA.calculate({
    period,
    values: bars.map((b) => b.close),
  });
  const v = vals.at(-1);
  return v == null || Number.isNaN(v) ? null : v;
}

function latestEma(bars: OHLCVBar[], period: number): number | null {
  if (bars.length < period) return null;
  const vals = EMA.calculate({
    period,
    values: bars.map((b) => b.close),
  });
  const v = vals.at(-1);
  return v == null || Number.isNaN(v) ? null : v;
}

function latestRsi(bars: OHLCVBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const vals = RSI.calculate({
    period,
    values: bars.map((b) => b.close),
  });
  const v = vals.at(-1);
  return v == null || Number.isNaN(v) ? null : v;
}

function latestMacdHist(
  bars: OHLCVBar[],
  fast = 12,
  slow = 26,
  signal = 9,
): number | null {
  const minBars = slow + signal;
  if (bars.length < minBars) return null;
  const vals = MACD.calculate({
    values: bars.map((b) => b.close),
    fastPeriod: fast,
    slowPeriod: slow,
    signalPeriod: signal,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const v = vals.at(-1)?.histogram;
  return v == null || Number.isNaN(v) ? null : v;
}

function latestBbBands(
  bars: OHLCVBar[],
  period = 20,
  stdDev = 2,
): { upper: number; lower: number } | null {
  if (bars.length < period) return null;
  const vals = BollingerBands.calculate({
    period,
    stdDev,
    values: bars.map((b) => b.close),
  });
  const last = vals.at(-1);
  if (!last) return null;
  if (
    last.upper == null ||
    last.lower == null ||
    Number.isNaN(last.upper) ||
    Number.isNaN(last.lower)
  ) {
    return null;
  }
  return { upper: last.upper, lower: last.lower };
}



interface ScoringPreset {

  timeframe: string;

  categories: {

    name: string;

    weight: number;

    rules: Record<string, unknown>[];

  }[];

  grades: { grade: string; min: number }[];

}



interface RuleEval {

  points: number;

  maxPoints: number;

  skipped?: string;

}



function gradeFromScore(

  score: number,

  grades: { grade: string; min: number }[],

): string {

  if (!grades.length) {

    throw new ConfigError("Scoring preset grades array is empty");

  }

  const sorted = [...grades].sort((a, b) => b.min - a.min);

  for (const g of sorted) {

    if (score >= g.min) return g.grade;

  }

  return "F";

}



function lastClose(bars: OHLCVBar[]): number {

  const bar = bars.at(-1);

  if (!bar) {

    throw new InsufficientDataError("No bars available for scoring");

  }

  return bar.close;

}



function evalRule(
  rule: Record<string, unknown>,
  bars: OHLCVBar[],
): RuleEval {

  const ruleType = requireDefined(rule.type, "rule.type");

  const ruleScore = requireNumber(rule.score, "rule.score");

  const close = lastClose(bars);



  if (ruleType === "compare") {
    const right = requireDefined(rule.right as string, "rule.right");
    const op = requireDefined(rule.op as string, "rule.op");
    let rhs: number | null = null;

    const smaMatch = /^sma:(\d+)$/.exec(right);
    const emaMatch = /^ema:(\d+)$/.exec(right);
    if (smaMatch) {
      rhs = latestSma(bars, Number(smaMatch[1]));
    } else if (emaMatch) {
      rhs = latestEma(bars, Number(emaMatch[1]));
    } else {
      throw new ConfigError(`Unsupported compare right: ${right}`);
    }

    if (rhs == null) {
      const period = Number((smaMatch ?? emaMatch)![1]);
      const kind = smaMatch ? "SMA" : "EMA";
      return {
        points: 0,
        maxPoints: 0,
        skipped: `점수 규칙: ${kind}(${period}) 계산에 봉 ${period}개 필요 · 현재 ${bars.length}개`,
      };
    }

    const pass = op === "gt" ? close > rhs : close < rhs;
    return { points: pass ? ruleScore : 0, maxPoints: ruleScore };
  }

  if (ruleType === "rsi_mid") {
    const period =
      typeof rule.period === "number" && Number.isFinite(rule.period)
        ? rule.period
        : 14;
    const rsi = latestRsi(bars, period);
    if (rsi == null) {
      return {
        points: 0,
        maxPoints: 0,
        skipped: `점수 규칙: RSI(${period}) 계산에 데이터 부족 · 현재 ${bars.length}봉`,
      };
    }

    const low = requireNumber(rule.low, "rule.low");
    const high = requireNumber(rule.high, "rule.high");
    if (rsi >= low && rsi <= high) return { points: ruleScore, maxPoints: ruleScore };
    if (rsi < low) return { points: ruleScore * 0.8, maxPoints: ruleScore };
    return { points: ruleScore * 0.3, maxPoints: ruleScore };
  }

  if (ruleType === "macd_hist") {
    const hist = latestMacdHist(bars);
    if (hist == null) {
      return {
        points: 0,
        maxPoints: 0,
        skipped: `점수 규칙: MACD 계산에 데이터 부족 · 현재 ${bars.length}봉`,
      };
    }

    return {
      points: hist > 0 ? ruleScore : ruleScore * 0.2,
      maxPoints: ruleScore,
    };
  }

  if (ruleType === "bb_position") {
    const bands = latestBbBands(bars);
    const upper = bands?.upper ?? null;
    const lower = bands?.lower ?? null;

    if (upper == null || lower == null) {
      return {
        points: 0,
        maxPoints: 0,
        skipped: `점수 규칙: 볼린저 밴드 계산에 데이터 부족 · 현재 ${bars.length}봉`,
      };
    }

    if (upper === lower) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: "bb_position: flat Bollinger band range",

      };

    }

    const pos = (close - lower) / (upper - lower);

    if (pos > 0.8) return { points: ruleScore * 0.4, maxPoints: ruleScore };

    if (pos < 0.2) return { points: ruleScore * 0.9, maxPoints: ruleScore };

    return { points: ruleScore * 0.7, maxPoints: ruleScore };

  }



  if (ruleType === "volume_vs_avg") {

    const period = requireNumber(rule.period, "rule.period");

    if (bars.length < period) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: `volume_vs_avg: need at least ${period} bars, got ${bars.length}`,

      };

    }

    const slice = bars.slice(-period);

    const avg = slice.reduce((s, b) => s + b.volume, 0) / slice.length;

    const lastVol = bars.at(-1)!.volume;

    return {

      points: lastVol >= avg ? ruleScore : ruleScore * 0.5,

      maxPoints: ruleScore,

    };

  }



  if (ruleType === "price_in_range") {

    const lookback = requireNumber(rule.lookback, "rule.lookback");

    if (bars.length < lookback) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: `price_in_range: need at least ${lookback} bars, got ${bars.length}`,

      };

    }

    const slice = bars.slice(-lookback);

    const min = Math.min(...slice.map((b) => b.low));

    const max = Math.max(...slice.map((b) => b.high));

    if (max === min) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: "price_in_range: flat range in lookback",

      };

    }

    const pos = (close - min) / (max - min);

    return { points: pos * ruleScore, maxPoints: ruleScore };

  }



  throw new ConfigError(`Unknown scoring rule type: ${ruleType}`);

}



export function computeScore(
  bars: OHLCVBar[],
  _indicatorResults: IndicatorResults,
  presetKey: string,
): ScoreResult {
  // Score rules compute their own series from OHLCV; chart indicator config is ignored.
  requireNonEmptyArray(bars, "OHLCV bars for scoring");

  const presets = getEffectiveScoringConfig().presets as Record<
    string,
    ScoringPreset
  >;

  const preset = presets[presetKey];

  if (!preset) {

    throw new ConfigError(`Scoring preset not found: ${presetKey}`);

  }



  const breakdown: ScoreBreakdown[] = [];

  const skippedRules: string[] = [];

  let total = 0;

  let activeWeight = 0;



  for (const cat of preset.categories) {

    let catScore = 0;

    let maxRule = 0;

    for (const rule of cat.rules) {

      const result = evalRule(rule, bars);

      catScore += result.points;

      maxRule += result.maxPoints;

      if (result.skipped) skippedRules.push(result.skipped);

    }

    if (maxRule <= 0) continue;



    const normalized = Math.min(100, (catScore / maxRule) * 100);

    const weighted = normalized * cat.weight;

    total += weighted;

    activeWeight += cat.weight;

    breakdown.push({

      name: cat.name,

      weight: cat.weight,

      score: Math.round(normalized),

      weighted: Math.round(weighted * 10) / 10,

    });

  }



  const value =

    activeWeight > 0

      ? Math.round(Math.min(100, total / activeWeight))

      : 0;



  return {

    value,

    grade: gradeFromScore(value, preset.grades),

    preset: presetKey,

    breakdown,

    skippedRules: skippedRules.length ? skippedRules : undefined,

  };

}



export function presetForTimeframe(tf: string): string {

  const presets = getEffectiveScoringConfig().presets as Record<
    string,
    ScoringPreset
  >;

  const key = `${tf}_default`;

  if (presets[key]) return key;

  if (tf === "1w" && presets["1w_swing"]) return "1w_swing";

  throw new ConfigError(`No scoring preset for timeframe: ${tf}`);

}
