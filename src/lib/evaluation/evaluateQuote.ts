import {
  closedBars,
  recordConfirmedHits,
  type ReplayHit,
} from "./confirmedSignals";
import {
  scoreSignalHits,
  type ScoreableHit,
  type SignalStatsMap,
} from "./signalFollowThrough";
import { ANALYSIS_VERSIONS, versionFor } from "../versions";

import { getEffectiveScoringConfig } from "../configStore";
import type {
  OHLCVBar,
  IndicatorResults,
  ScoreResult,
  Timeframe,
} from "../types";
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
  type TrendlineAlgoVersion,
  type TrendlineResult,
} from "./trendlines";
import { detectTrendlinesV2 } from "./trendlinesV2";
import { getTrendlineAlgoVersion } from "../trendlineStore";
import { detectBbStrategies, type BbStrategyResult } from "./bbStrategies";
import { detectChartPatterns, type ChartPatternResult } from "./chartPatterns";
import {
  detectPatternStrategies,
  type PatternStrategyResult,
} from "./patternStrategies";
import { detectRsiStrategies, type RsiStrategyResult } from "./rsiStrategies";
import {
  detectIchimokuStrategies,
  type IchimokuStrategyResult,
} from "./ichimokuStrategies";
import {
  detectMacdStrategies,
  type MacdStrategyResult,
} from "./macdStrategies";
import {
  detectStochStrategies,
  type StochStrategyResult,
} from "./stochStrategies";
import {
  detectVolumeStrategies,
  type VolumeStrategyResult,
} from "./volumeStrategies";
import {
  detectComboStrategies,
  type ComboStrategyResult,
} from "./comboStrategies";
import {
  detectClassicStrategies,
  type ClassicStrategyResult,
} from "./classicStrategies";
import { detectElliottWaves, type ElliottWaveResult } from "./elliottWaves";

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
  macdStrategies: MacdStrategyResult | null;
  stochStrategies: StochStrategyResult | null;
  ichimokuStrategies: IchimokuStrategyResult | null;
  volumeStrategies: VolumeStrategyResult | null;
  comboStrategies: ComboStrategyResult | null;
  classicStrategies: ClassicStrategyResult | null;
  elliottWaves: ElliottWaveResult | null;
  /** Follow-through rates by pattern/strategy id (full prepared ticker window). */
  signalStats: SignalStatsBundle;
  warnings: string[];
  fatalError: string | null;
  /** Bars actually used after lookback / maxBars / cadence cleanup. */
  bars: OHLCVBar[];
  provenance?: Record<string, unknown>;
}

const EMPTY_INDICATORS: IndicatorResults = { indicators: {}, signals: [] };

function absorbError(err: unknown, warnings: string[]): string | null {
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

function evaluateSnapshot(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  indicatorConfig: IndicatorsConfig,
  options?: {
    trendlineAlgo?: TrendlineAlgoVersion;
    scoringConfig?: ReturnType<typeof getEffectiveScoringConfig>;
  },
): QuoteEvaluation {
  const warnings: string[] = [];
  let fatalError: string | null = null;
  const prepared = bars;

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
      macdStrategies: null,
      stochStrategies: null,
      ichimokuStrategies: null,
      volumeStrategies: null,
      comboStrategies: null,
      classicStrategies: null,
      elliottWaves: null,
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
      score = computeScore(
        prepared,
        indicators,
        presetForTimeframe(timeframe, options?.scoringConfig),
        options?.scoringConfig,
      );
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
      const algo = options?.trendlineAlgo ?? getTrendlineAlgoVersion();
      trendlines =
        algo === "v2"
          ? detectTrendlinesV2(prepared)
          : detectTrendlines(prepared);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  /** Score follow-through on the full prepared ticker window. */
  const fullLookback = { lookbackBars: prepared.length };

  let bbStrategies: BbStrategyResult | null = null;
  if (!fatalError) {
    try {
      bbStrategies = detectBbStrategies(prepared, indicators, fullLookback);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let classicalPatterns: ChartPatternResult | null = null;
  if (!fatalError) {
    try {
      classicalPatterns = detectChartPatterns(prepared, fullLookback);
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
      const rsiCfg = indicatorConfig.indicators.find(
        (item) => item.id === "rsi",
      );
      rsiStrategies = detectRsiStrategies(prepared, indicators, {
        overbought: (rsiCfg?.overbought as number | undefined) ?? 70,
        oversold: (rsiCfg?.oversold as number | undefined) ?? 30,
        ...fullLookback,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let macdStrategies: MacdStrategyResult | null = null;
  if (!fatalError) {
    try {
      macdStrategies = detectMacdStrategies(prepared, indicators, fullLookback);
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let stochStrategies: StochStrategyResult | null = null;
  if (!fatalError) {
    try {
      const stochCfg = indicatorConfig.indicators.find(
        (item) => item.id === "stoch",
      );
      stochStrategies = detectStochStrategies(
        prepared,
        indicators,
        supportResistance,
        {
          overbought: (stochCfg?.overbought as number | undefined) ?? 80,
          oversold: (stochCfg?.oversold as number | undefined) ?? 20,
          ...fullLookback,
        },
      );
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let ichimokuStrategies: IchimokuStrategyResult | null = null;
  if (!fatalError) {
    try {
      const ichiCfg = indicatorConfig.indicators.find(
        (item) => item.id === "ichimoku",
      );
      ichimokuStrategies = detectIchimokuStrategies(prepared, indicators, {
        displacement:
          (ichiCfg?.params.displacement as number | undefined) ?? 26,
        ...fullLookback,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let volumeStrategies: VolumeStrategyResult | null = null;
  if (!fatalError) {
    try {
      volumeStrategies = detectVolumeStrategies(prepared, indicators, {
        ...fullLookback,
        trendlines,
        patterns,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let comboStrategies: ComboStrategyResult | null = null;
  if (!fatalError) {
    try {
      comboStrategies = detectComboStrategies(
        prepared,
        indicators,
        fullLookback,
      );
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let classicStrategies: ClassicStrategyResult | null = null;
  if (!fatalError) {
    try {
      classicStrategies = detectClassicStrategies(prepared, indicators, {
        ...fullLookback,
        timeframe,
      });
    } catch (err) {
      const fatal = absorbError(err, warnings);
      if (fatal) fatalError = fatal;
    }
  }

  let elliottWaves: ElliottWaveResult | null = null;
  if (!fatalError) {
    try {
      elliottWaves = detectElliottWaves(prepared, structure);
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
    macdStrategy: macdStrategies?.stats ?? {},
    stochStrategy: stochStrategies?.stats ?? {},
    ichimokuStrategy: ichimokuStrategies?.stats ?? {},
    volumeStrategy: volumeStrategies?.stats ?? {},
    comboStrategy: comboStrategies?.stats ?? {},
    classicStrategy: classicStrategies?.stats ?? {},
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
    macdStrategies,
    stochStrategies,
    ichimokuStrategies,
    volumeStrategies,
    comboStrategies,
    classicStrategies,
    elliottWaves,
    signalStats,
    warnings,
    fatalError,
    bars: prepared,
  };
}

const REPLAY_FAMILIES = [
  ["patterns", "candle", "candlePattern"],
  ["classicalPatterns", "chart", "chartPattern"],
  ["bbStrategies", "bb", "bbStrategy"],
  ["classicStrategies", "classic", "classicStrategy"],
  ["ichimokuStrategies", "ichimoku", "ichimokuStrategy"],
  ["volumeStrategies", "volume", "volumeStrategy"],
  ["rsiStrategies", "rsi", "rsiStrategy"],
  ["macdStrategies", "macd", "macdStrategy"],
  ["stochStrategies", "stoch", "stochStrategy"],
  ["patternStrategies", "pattern", "patternStrategy"],
  ["comboStrategies", "combo", "comboStrategy"],
] as const;

type ReplayBag = {
  signals?: ReplayHit[];
  recent: ReplayHit[];
  onLatestBar: ReplayHit[];
  stats: SignalStatsMap;
};

export function evaluateQuote(
  bars: OHLCVBar[],
  timeframe: Timeframe,
  indicatorConfig: IndicatorsConfig,
  options?: {
    trendlineAlgo?: TrendlineAlgoVersion;
    asOf?: string;
    scoringConfig?: ReturnType<typeof getEffectiveScoringConfig>;
  },
): QuoteEvaluation {
  const warnings: string[] = [];
  const prepared = prepareBars(bars, timeframe, warnings);
  const asOf = options?.asOf ?? new Date().toISOString();
  const complete = closedBars(prepared, timeframe, asOf);
  const seen = REPLAY_FAMILIES.map(() => new Set<string>());
  const events: ReplayHit[][] = REPLAY_FAMILIES.map(() => []);
  let result = evaluateSnapshot([], timeframe, indicatorConfig, options);
  for (let end = 1; end <= complete.length; end++) {
    const prefix = complete.slice(0, end);
    result = evaluateSnapshot(prefix, timeframe, indicatorConfig, options);
    if (result.fatalError) continue;
    REPLAY_FAMILIES.forEach(([key, namespace], index) => {
      const bag = result[key] as ReplayBag | null;
      if (!bag) return;
      recordConfirmedHits(
        bag.signals ?? bag.recent,
        prefix,
        namespace,
        seen[index],
        events[index],
      );
    });
  }
  REPLAY_FAMILIES.forEach(([key, , statsKey], index) => {
    const bag = result[key] as ReplayBag | null;
    if (!bag) return;
    bag.signals = events[index];
    bag.recent = events[index];
    bag.onLatestBar = events[index].filter(
      (hit) => hit.barIndex === complete.length - 1,
    );
    bag.stats = scoreSignalHits(complete, events[index] as ScoreableHit[]);
    result.signalStats[statsKey] = bag.stats;
  });
  if (complete.length < prepared.length)
    warnings.push(
      `미완성 봉 ${prepared.length - complete.length}개를 확정 신호·성과 계산에서 제외했습니다.`,
    );
  result.warnings.push(...warnings);
  for (const output of Object.values(result.indicators.indicators))
    output.version = versionFor("indicator", output.id);
  for (const signal of result.indicators.signals) {
    signal.version = versionFor("signal", signal.id);
    signal.confirmedBarIndex = complete.length - 1;
    signal.confirmedDate = complete.at(-1)?.date;
  }
  const dataText = JSON.stringify(complete);
  let dataHash = 2166136261;
  for (let i = 0; i < dataText.length; i++)
    dataHash = Math.imul(dataHash ^ dataText.charCodeAt(i), 16777619) >>> 0;
  result.provenance = {
    dataFingerprint: `fnv1a32:${dataHash.toString(16)}`,
    versions: ANALYSIS_VERSIONS,
    indicatorConfig,
    timeframe,
    asOf,
    scoringConfig: options?.scoringConfig ?? getEffectiveScoringConfig(),
    firstBar: complete[0]?.date,
    lastBar: complete.at(-1)?.date,
    trendlineAlgo: options?.trendlineAlgo ?? getTrendlineAlgoVersion(),
  };
  return result;
}
