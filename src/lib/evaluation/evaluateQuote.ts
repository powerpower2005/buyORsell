import type { OHLCVBar, IndicatorResults, ScoreResult, Timeframe } from "../types";
import type { IndicatorsConfig } from "./types";
import type { CandlePatternResult } from "./candlePatterns";
import type { VolumeMaSnapshot } from "./volumeMa";
import type { MTFAlignment } from "../types";
import { windowBars } from "../barWindow";
import {
  assertBarsMatchTimeframe,
  dropLeadingWrongCadence,
} from "../barCadence";
import {
  errorMessage,
  isInsufficientDataError,
  isOhlcQualityError,
} from "../errors";
import { computeAll } from "./registry";
import { computeScore, presetForTimeframe } from "./scoring";
import { computeMTFAlignment } from "./mtfAlignment";
import { computeVolumeAverages, getVolumeMaPeriods } from "./volumeMa";
import { detectCandlePatterns } from "./candlePatterns";
import {
  detectSwingStructure,
  type SwingStructureResult,
} from "./swingStructure";
import {
  detectSupportResistance,
  type SupportResistanceResult,
} from "./supportResistance";
import {
  detectTrendlines,
  type TrendlineResult,
} from "./trendlines";

export interface QuoteEvaluation {
  indicators: IndicatorResults;
  score: ScoreResult | null;
  mtf: MTFAlignment;
  volume: VolumeMaSnapshot;
  patterns: CandlePatternResult | null;
  structure: SwingStructureResult | null;
  supportResistance: SupportResistanceResult | null;
  trendlines: TrendlineResult | null;
  warnings: string[];
  fatalError: string | null;
  /** Bars actually used after lookback / maxBars / cadence cleanup. */
  bars: OHLCVBar[];
}

const EMPTY_INDICATORS: IndicatorResults = { indicators: {}, signals: [] };

function absorbError(
  err: unknown,
  warnings: string[],
): string | null {
  if (isOhlcQualityError(err)) return errorMessage(err);
  if (isInsufficientDataError(err)) {
    warnings.push(errorMessage(err));
    return null;
  }
  return errorMessage(err);
}

function prepareBars(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  warnings: string[],
): OHLCVBar[] {
  let out = dropLeadingWrongCadence(bars, timeframe);
  out = windowBars(out, timeframe);
  if (out.length < bars.length) {
    warnings.push(
      `Using ${out.length} of ${bars.length} bars within ${timeframe} window`,
    );
  }
  try {
    assertBarsMatchTimeframe(out, timeframe, "quote");
  } catch (err) {
    warnings.push(errorMessage(err));
  }
  return out;
}

export function evaluateQuote(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  indicatorConfig: IndicatorsConfig,
): QuoteEvaluation {
  const warnings: string[] = [];
  let fatalError: string | null = null;
  const prepared = prepareBars(bars, timeframe, warnings);

  if (!prepared.length) {
    return {
      indicators: EMPTY_INDICATORS,
      score: null,
      mtf: { alignmentPct: 0, byTimeframe: {}, enabled: false },
      volume: {
        currentVolume: 0,
        currentDate: "",
        averages: [],
      },
      patterns: null,
      structure: null,
      supportResistance: null,
      trendlines: null,
      warnings,
      fatalError: "No OHLCV bars available",
      bars: [],
    };
  }

  let indicators = EMPTY_INDICATORS;
  try {
    indicators = computeAll(prepared, timeframe, indicatorConfig);
    if (indicators.skipped?.length) warnings.push(...indicators.skipped);
  } catch (err) {
    const fatal = absorbError(err, warnings);
    if (fatal) fatalError = fatal;
  }

  let score: ScoreResult | null = null;
  if (!fatalError) {
    try {
      score = computeScore(prepared, indicators, presetForTimeframe(timeframe));
      if (score.skippedRules?.length) warnings.push(...score.skippedRules);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  const volume = computeVolumeAverages(prepared, getVolumeMaPeriods(timeframe));
  const mtf = computeMTFAlignment({ [timeframe]: indicators });

  let patterns: CandlePatternResult | null = null;
  if (!fatalError) {
    try {
      patterns = detectCandlePatterns(prepared);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let structure: SwingStructureResult | null = null;
  if (!fatalError) {
    try {
      structure = detectSwingStructure(prepared);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let supportResistance: SupportResistanceResult | null = null;
  if (!fatalError) {
    try {
      supportResistance = detectSupportResistance(prepared, {
        timeframe,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let trendlines: TrendlineResult | null = null;
  if (!fatalError) {
    try {
      trendlines = detectTrendlines(prepared);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  return {
    indicators,
    score,
    mtf,
    volume,
    patterns,
    structure,
    supportResistance,
    trendlines,
    warnings,
    fatalError,
    bars: prepared,
  };
}
