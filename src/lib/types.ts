export type Timeframe = "15m" | "1h" | "4h" | "1d" | "1w";

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteFile {
  ticker: string;
  timeframe: Timeframe;
  window?: string;
  schemaVersion?: number;
  intervalSeconds?: number;
  fetchedAt: string;
  lastBarDate: string;
  barCount: number;
  checksum?: string;
  source?: "gf" | "google_sheets_googfinance";
  resolvedSymbol?: string;
  ohlcv: OHLCVBar[];
}

export interface StatusFile {
  status: "idle" | "running" | "ready" | "failed" | "skipped";
  startedAt?: string;
  updatedAt?: string;
  ticker?: string;
  timeframe?: Timeframe;
  runId?: string;
}

export interface IndexFile {
  schemaVersion: number;
  updatedAt: string;
  entries: IndexEntry[];
}

export interface IndexEntry {
  ticker: string;
  timeframe: Timeframe;
  path: string;
  fetchedAt: string;
  lastBarDate?: string;
  barCount?: number;
}

export type TrendLabel = "bullish" | "bearish" | "neutral";

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface IndicatorOutput {
  id: string;
  series: Record<string, SeriesPoint[]>;
  latest: Record<string, number | null>;
}

export interface IndicatorResults {
  indicators: Record<string, IndicatorOutput>;
  signals: SignalResult[];
  skipped?: string[];
}

export interface SignalResult {
  id: string;
  label: string;
  active: boolean;
  direction: TrendLabel;
}

export interface ScoreBreakdown {
  name: string;
  weight: number;
  score: number;
  weighted: number;
}

export interface ScoreResult {
  value: number;
  grade: string;
  preset: string;
  breakdown: ScoreBreakdown[];
  skippedRules?: string[];
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  side?: "long" | "short";
  entryBarIndex?: number;
  exitBarIndex?: number;
  strategyId?: string;
  strategyLabel?: string;
  exitReason?: string;
}

export interface BacktestResult {
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRate: number;
  trades: BacktestTrade[];
  tradeCount: number;
  avgReturnPct?: number;
  avgWinPct?: number;
  avgLossPct?: number;
  /** null when no losses (infinite). */
  profitFactor?: number | null;
  expectancyPct?: number;
  longCount?: number;
  shortCount?: number;
  winCount?: number;
  lossCount?: number;
}

export interface MTFAlignment {
  alignmentPct: number;
  byTimeframe: Record<string, TrendLabel>;
  enabled: boolean;
}
