import type { OHLCVBar, ScoreBreakdown, ScoreResult } from "../types";

import type { IndicatorResults } from "../types";

import scoringConfig from "../../../config/scoring.json";

import { ConfigError, InsufficientDataError } from "../errors";

import { requireDefined, requireMinBars, requireNonEmptyArray, requireNumber } from "../require";



interface ScoringPreset {

  timeframe: string;

  categories: {

    name: string;

    weight: number;

    rules: Record<string, unknown>[];

  }[];

  grades: { grade: string; min: number }[];

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



function requireIndicatorValue(

  indicators: IndicatorResults["indicators"],

  pluginId: string,

  key: string,

): number {

  const out = indicators[pluginId];

  if (!out) {

    throw new InsufficientDataError(`Indicator not computed: ${pluginId}`);

  }

  const val = out.latest[key];

  if (val == null) {

    throw new InsufficientDataError(`Indicator value missing: ${pluginId}.${key}`);

  }

  return val;

}



function evalRule(

  rule: Record<string, unknown>,

  bars: OHLCVBar[],

  indicators: IndicatorResults["indicators"],

): number {

  const ruleType = requireDefined(rule.type, "rule.type");

  const ruleScore = requireNumber(rule.score, "rule.score");

  const close = lastClose(bars);



  if (ruleType === "compare") {

    const right = requireDefined(rule.right as string, "rule.right");

    const op = requireDefined(rule.op as string, "rule.op");

    let rhs: number;

    if (right.startsWith("sma:")) {

      rhs = requireIndicatorValue(indicators, "sma", right);

    } else if (right.startsWith("ema:")) {

      rhs = requireIndicatorValue(indicators, "ema", right);

    } else {

      throw new ConfigError(`Unsupported compare right: ${right}`);

    }

    const pass = op === "gt" ? close > rhs : close < rhs;

    return pass ? ruleScore : 0;

  }



  if (ruleType === "rsi_mid") {

    const rsi = requireIndicatorValue(indicators, "rsi", "rsi");

    const low = requireNumber(rule.low, "rule.low");

    const high = requireNumber(rule.high, "rule.high");

    if (rsi >= low && rsi <= high) return ruleScore;

    if (rsi < low) return ruleScore * 0.8;

    return ruleScore * 0.3;

  }



  if (ruleType === "macd_hist") {

    const hist = requireIndicatorValue(indicators, "macd", "macdHist");

    return hist > 0 ? ruleScore : ruleScore * 0.2;

  }



  if (ruleType === "bb_position") {

    const upper = requireIndicatorValue(indicators, "bb", "bbUpper");

    const lower = requireIndicatorValue(indicators, "bb", "bbLower");

    if (upper === lower) {

      throw new InsufficientDataError("Bollinger bands upper equals lower");

    }

    const pos = (close - lower) / (upper - lower);

    if (pos > 0.8) return ruleScore * 0.4;

    if (pos < 0.2) return ruleScore * 0.9;

    return ruleScore * 0.7;

  }



  if (ruleType === "volume_vs_avg") {
    const period = requireNumber(rule.period, "rule.period");
    requireMinBars(bars.length, period, "volume_vs_avg");
    const slice = bars.slice(-period);
    const avg = slice.reduce((s, b) => s + b.volume, 0) / slice.length;
    const lastVol = bars.at(-1)!.volume;
    return lastVol >= avg ? ruleScore : ruleScore * 0.5;
  }



  if (ruleType === "price_in_range") {

    const lookback = requireNumber(rule.lookback, "rule.lookback");

    requireMinBars(bars.length, lookback, "price_in_range");

    const slice = bars.slice(-lookback);

    const min = Math.min(...slice.map((b) => b.low));

    const max = Math.max(...slice.map((b) => b.high));

    if (max === min) {

      throw new InsufficientDataError("price_in_range: flat range in lookback");

    }

    const pos = (close - min) / (max - min);

    return pos * ruleScore;

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

  let total = 0;



  for (const cat of preset.categories) {

    let catScore = 0;

    for (const rule of cat.rules) {

      catScore += evalRule(rule, bars, indicatorResults.indicators);

    }

    const maxRule = cat.rules.reduce(

      (s, r) => s + requireNumber(r.score, "rule.score"),

      0,

    );

    const normalized = maxRule > 0 ? Math.min(100, (catScore / maxRule) * 100) : 0;

    const weighted = normalized * cat.weight;

    total += weighted;

    breakdown.push({

      name: cat.name,

      weight: cat.weight,

      score: Math.round(normalized),

      weighted: Math.round(weighted * 10) / 10,

    });

  }



  const value = Math.round(Math.min(100, total));

  return {

    value,

    grade: gradeFromScore(value, preset.grades),

    preset: presetKey,

    breakdown,

  };

}



export function presetForTimeframe(tf: string): string {

  const presets = scoringConfig.presets as Record<string, ScoringPreset>;

  const key = `${tf}_default`;

  if (presets[key]) return key;

  if (tf === "1w" && presets["1w_swing"]) return "1w_swing";

  throw new ConfigError(`No scoring preset for timeframe: ${tf}`);

}

