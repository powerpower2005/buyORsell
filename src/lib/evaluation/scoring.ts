import type { OHLCVBar, ScoreBreakdown, ScoreResult } from "../types";

import type { IndicatorResults } from "../types";

import scoringConfig from "../../../config/scoring.json";

import { ConfigError, InsufficientDataError } from "../errors";

import { requireDefined, requireNonEmptyArray, requireNumber } from "../require";



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



function tryIndicatorValue(

  indicators: IndicatorResults["indicators"],

  pluginId: string,

  key: string,

): number | null {

  const out = indicators[pluginId];

  if (!out) return null;

  const val = out.latest[key];

  return val ?? null;

}



function evalRule(

  rule: Record<string, unknown>,

  bars: OHLCVBar[],

  indicators: IndicatorResults["indicators"],

): RuleEval {

  const ruleType = requireDefined(rule.type, "rule.type");

  const ruleScore = requireNumber(rule.score, "rule.score");

  const close = lastClose(bars);



  if (ruleType === "compare") {

    const right = requireDefined(rule.right as string, "rule.right");

    const op = requireDefined(rule.op as string, "rule.op");

    let rhs: number | null;

    if (right.startsWith("sma:")) {

      rhs = tryIndicatorValue(indicators, "sma", right);

    } else if (right.startsWith("ema:")) {

      rhs = tryIndicatorValue(indicators, "ema", right);

    } else {

      throw new ConfigError(`Unsupported compare right: ${right}`);

    }

    if (rhs == null) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: `compare ${right}: indicator not available`,

      };

    }

    const pass = op === "gt" ? close > rhs : close < rhs;

    return { points: pass ? ruleScore : 0, maxPoints: ruleScore };

  }



  if (ruleType === "rsi_mid") {

    const rsi = tryIndicatorValue(indicators, "rsi", "rsi");

    if (rsi == null) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: "rsi_mid: RSI not available",

      };

    }

    const low = requireNumber(rule.low, "rule.low");

    const high = requireNumber(rule.high, "rule.high");

    if (rsi >= low && rsi <= high) return { points: ruleScore, maxPoints: ruleScore };

    if (rsi < low) return { points: ruleScore * 0.8, maxPoints: ruleScore };

    return { points: ruleScore * 0.3, maxPoints: ruleScore };

  }



  if (ruleType === "macd_hist") {

    const hist = tryIndicatorValue(indicators, "macd", "macdHist");

    if (hist == null) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: "macd_hist: MACD not available",

      };

    }

    return {

      points: hist > 0 ? ruleScore : ruleScore * 0.2,

      maxPoints: ruleScore,

    };

  }



  if (ruleType === "bb_position") {

    const upper = tryIndicatorValue(indicators, "bb", "bbUpper");

    const lower = tryIndicatorValue(indicators, "bb", "bbLower");

    if (upper == null || lower == null) {

      return {

        points: 0,

        maxPoints: 0,

        skipped: "bb_position: Bollinger bands not available",

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

  indicatorResults: IndicatorResults,

  presetKey: string,

): ScoreResult {

  requireNonEmptyArray(bars, "OHLCV bars for scoring");

  const presets = scoringConfig.presets as Record<string, ScoringPreset>;

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

      const result = evalRule(rule, bars, indicatorResults.indicators);

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

  const presets = scoringConfig.presets as Record<string, ScoringPreset>;

  const key = `${tf}_default`;

  if (presets[key]) return key;

  if (tf === "1w" && presets["1w_swing"]) return "1w_swing";

  throw new ConfigError(`No scoring preset for timeframe: ${tf}`);

}
