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
import {
  detectBbStrategies,
  type BbStrategyResult,
} from "./bbStrategies";
import {
  detectChartPatterns,
  type ChartPatternResult,
} from "./chartPatterns";
import {
  detectPatternStrategies,
  type PatternStrategyResult,
} from "./patternStrategies";
import {
  detectRsiStrategies,
  type RsiStrategyResult,
} from "./rsiStrategies";
import {
  detectIchimokuStrategies,
  type IchimokuStrategyResult,
} from "./ichimokuStrategies";
import { getIndicatorConfig } from "../configStore";
import {
  EMPTY_SIGNAL_STATS,
  type SignalStatsBundle,
} from "./signalFollowThrough";

export interface QuoteEvaluation {
  indicators: IndicatorResults;
  score: ScoreResult | null;
  mtf: MTFAlignment;
  volume: VolumeMaSnapshot;
  patterns: CandlePatternResult | null;
  structure: SwingStructureResult | null;
  supportResistance: SupportResistanceResult | null;
  trendlines: TrendlineResult | null;
  bbStrategies: BbStrategyResult | null;
  classicalPatterns: ChartPatternResult | null;
  patternStrategies: PatternStrategyResult | null;
  rsiStrategies: RsiStrategyResult | null;
  ichimokuStrategies: IchimokuStrategyResult | null;
  /** Follow-through rates by pattern/strategy id (this ticker window). */
  signalStats: SignalStatsBundle;
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
      bbStrategies: null,
      classicalPatterns: null,
      patternStrategies: null,
      rsiStrategies: null,
      ichimokuStrategies: null,
      signalStats: EMPTY_SIGNAL_STATS,
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

  let bbStrategies: BbStrategyResult | null = null;
  if (!fatalError) {
    try {
      bbStrategies = detectBbStrategies(prepared, indicators);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let classicalPatterns: ChartPatternResult | null = null;
  if (!fatalError) {
    try {
      classicalPatterns = detectChartPatterns(prepared);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let patternStrategies: PatternStrategyResult | null = null;
  if (!fatalError) {
    try {
      patternStrategies = detectPatternStrategies(prepared, classicalPatterns);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let rsiStrategies: RsiStrategyResult | null = null;
  if (!fatalError) {
    try {
      const rsiCfg = getIndicatorConfig("rsi");
      rsiStrategies = detectRsiStrategies(prepared, indicators, {
        overbought: (rsiCfg?.overbought as number | undefined) ?? 70,
        oversold: (rsiCfg?.oversold as number | undefined) ?? 30,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let ichimokuStrategies: IchimokuStrategyResult | null = null;
  if (!fatalError) {
    try {
      const ichiCfg = getIndicatorConfig("ichimoku");
      ichimokuStrategies = detectIchimokuStrategies(prepared, indicators, {
        displacement:
          (ichiCfg?.params.displacement as number | undefined) ?? 26,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  const signalStats: SignalStatsBundle = {
    candlePattern: patterns?.stats ?? {},
    chartPattern: classicalPatterns?.stats ?? {},
    patternStrategy: patternStrategies?.stats ?? {},
    bbStrategy: bbStrategies?.stats ?? {},
    rsiStrategy: rsiStrategies?.stats ?? {},
    ichimokuStrategy: ichimokuStrategies?.stats ?? {},
  };

  return {
    indicators,
    score,
    mtf,
    volume,
    patterns,
    structure,
    supportResistance,
    trendlines,
    bbStrategies,
    classicalPatterns,
    patternStrategies,
    rsiStrategies,
    ichimokuStrategies,
    signalStats,
    warnings,
    fatalError,
    bars: prepared,
  };
}
