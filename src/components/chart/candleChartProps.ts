import type { OHLCVBar, Timeframe, IndicatorResults } from "@/lib/types";
import type {
  CandlePatternId,
  CandlePatternResult,
} from "@/lib/evaluation/candlePatterns";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import type { ElliottWaveResult } from "@/lib/evaluation/elliottWaves";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import type { TrendlineResult } from "@/lib/evaluation/trendlines";
import type { BbBandId } from "@/lib/bbOverlay";
import type { PatternStrategyResult } from "@/lib/evaluation/patternStrategies";
import type { PatternStrategyId } from "@/lib/patternStrategyMeta";
import type { BbStrategyResult } from "@/lib/evaluation/bbStrategies";
import type { BbStrategyId } from "@/lib/bbStrategyMeta";
import type { RsiStrategyResult } from "@/lib/evaluation/rsiStrategies";
import type { RsiStrategyId } from "@/lib/rsiStrategyMeta";
import type { VolumeStrategyResult } from "@/lib/evaluation/volumeStrategies";
import type { VolumeStrategyId } from "@/lib/volumeStrategyMeta";
import type { ComboStrategyResult } from "@/lib/evaluation/comboStrategies";
import type { ComboStrategyId } from "@/lib/comboStrategyMeta";
import type { IchimokuStrategyResult } from "@/lib/evaluation/ichimokuStrategies";
import type { IchimokuStrategyId } from "@/lib/ichimokuStrategyMeta";
import type { MacdStrategyResult } from "@/lib/evaluation/macdStrategies";
import type { MacdStrategyId } from "@/lib/macdStrategyMeta";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import type { StochStrategyResult } from "@/lib/evaluation/stochStrategies";
import type { StochStrategyId } from "@/lib/stochStrategyMeta";
import type { IchimokuPartId } from "@/lib/ichimokuOverlay";
import type { ChartPatternResult } from "@/lib/evaluation/chartPatterns";
import type { ChartPatternId } from "@/lib/chartPatternMeta";
import type { SwingChartToggleId } from "@/lib/swingStructureStore";
import type { ElliottWaveToggleId } from "@/lib/elliottWaveStore";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import type { TrendlineChartToggleId } from "@/lib/trendlineStore";
import type {
  FibExtraId,
  FibLevelRatio,
  FibRetracement,
} from "@/lib/fibonacciStore";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";

export interface CandleChartProps {
  bars: OHLCVBar[];
  timeframe: Timeframe;
  patterns?: CandlePatternResult;
  chartPatternVisibility?: Record<CandlePatternId, boolean>;
  structure?: SwingStructureResult;
  chartStructureVisibility?: Record<SwingChartToggleId, boolean>;
  elliottWaves?: ElliottWaveResult;
  chartElliottWaveVisibility?: Record<ElliottWaveToggleId, boolean>;
  supportResistance?: SupportResistanceResult;
  chartSrVisibility?: Record<SrChartToggleId, boolean>;
  trendlines?: TrendlineResult;
  chartTrendlineVisibility?: Record<TrendlineChartToggleId, boolean>;
  /** Per-line visibility keyed by Trendline.id. Missing id defaults to visible. */
  chartTrendlineLineVisibility?: Record<string, boolean>;
  /** Resolved per-line colors keyed by Trendline.id. */
  chartTrendlineColors?: Record<string, string>;
  indicators?: IndicatorResults;
  /** Per-period SMA/EMA line visibility. Missing period defaults to true. */
  maVisibility?: {
    sma?: Record<number, boolean>;
    ema?: Record<number, boolean>;
  };
  /** Per-band Bollinger visibility. Missing band defaults to true. */
  bbVisibility?: Partial<Record<BbBandId, boolean>>;
  bbStrategies?: BbStrategyResult;
  chartBbStrategyVisibility?: Record<BbStrategyId, boolean>;
  ichimokuVisibility?: Partial<Record<IchimokuPartId, boolean>>;
  ichimokuStrategies?: IchimokuStrategyResult;
  chartIchimokuStrategyVisibility?: Record<IchimokuStrategyId, boolean>;
  classicalPatterns?: ChartPatternResult;
  chartClassicalPatternVisibility?: Record<ChartPatternId, boolean>;
  patternStrategies?: PatternStrategyResult;
  chartPatternStrategyVisibility?: Record<PatternStrategyId, boolean>;
  rsiStrategies?: RsiStrategyResult;
  chartRsiStrategyVisibility?: Record<RsiStrategyId, boolean>;
  volumeStrategies?: VolumeStrategyResult;
  chartVolumeStrategyVisibility?: Record<VolumeStrategyId, boolean>;
  comboStrategies?: ComboStrategyResult;
  chartComboStrategyVisibility?: Record<ComboStrategyId, boolean>;
  macdStrategies?: MacdStrategyResult;
  chartMacdStrategyVisibility?: Record<MacdStrategyId, boolean>;
  classicStrategies?: ClassicStrategyResult;
  chartClassicStrategyVisibility?: Record<ClassicStrategyId, boolean>;
  stochStrategies?: StochStrategyResult;
  chartStochStrategyVisibility?: Record<StochStrategyId, boolean>;
  showVolume?: boolean;
  height?: number;
  fibDrawMode?: boolean;
  fibRetracement?: FibRetracement | null;
  fibLevelVisibility?: Record<FibLevelRatio, boolean>;
  /** 0%/100% guides and confluence band visibility. Missing defaults to true. */
  fibExtraVisibility?: Partial<Record<FibExtraId, boolean>>;
  /** Below-chart oscillator pane toggles. Missing / false = hidden. */
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  onFibChange?: () => void;
  journalEntries?: TradeJournalEntry[];
  strategyConfluences?: StrategyConfluence[];
  showStrategyConfluence?: boolean;
  /** Draw entry/stop/target RR boxes for visible strategy hits (v1). */
  showRiskReward?: boolean;
  /**
   * When enabled, only show strategy / candle / chart-pattern markers
   * (and related highlights) inside the last N bars. Persisted in sidebar.
   */
  recentSignalWindow?: { enabled: boolean; bars: number } | null;
}
