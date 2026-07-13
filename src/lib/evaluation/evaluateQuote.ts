import type { OHLCVBar, IndicatorResults, ScoreResult, Timeframe } from "../types";
import type { IndicatorsConfig } from "./types";
import type { CandlePatternResult } from "./candlePatterns";
import type { VolumeMaSnapshot } from "./volumeMa";
import type { MTFAlignment } from "../types";
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

export interface QuoteEvaluation {
  indicators: IndicatorResults;
  score: ScoreResult | null;
  mtf: MTFAlignment;
  volume: VolumeMaSnapshot;
  patterns: CandlePatternResult | null;
  warnings: string[];
  fatalError: string | null;
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

export function evaluateQuote(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  indicatorConfig: IndicatorsConfig,
): QuoteEvaluation {
  const warnings: string[] = [];
  let fatalError: string | null = null;

  if (!bars.length) {
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
      warnings: [],
      fatalError: "No OHLCV bars available",
    };
  }

  let indicators = EMPTY_INDICATORS;
  try {
    indicators = computeAll(bars, timeframe, indicatorConfig);
    if (indicators.skipped?.length) warnings.push(...indicators.skipped);
  } catch (err) {
    const fatal = absorbError(err, warnings);
    if (fatal) fatalError = fatal;
  }

  let score: ScoreResult | null = null;
  if (!fatalError) {
    try {
      score = computeScore(bars, indicators, presetForTimeframe(timeframe));
      if (score.skippedRules?.length) warnings.push(...score.skippedRules);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  const volume = computeVolumeAverages(bars, getVolumeMaPeriods(timeframe));
  const mtf = computeMTFAlignment({ [timeframe]: indicators });

  let patterns: CandlePatternResult | null = null;
  if (!fatalError) {
    try {
      patterns = detectCandlePatterns(bars);
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
    warnings,
    fatalError,
  };
}
