import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { TickerInput } from "@/components/TickerInput";
import { TimeframeTabs } from "@/components/TimeframeTabs";
import { RequestDataButton } from "@/components/RequestDataButton";
import {
  AnalysisStatusCard,
  type AnalysisStatus,
} from "@/components/AnalysisStatusCard";
import { CandleChart } from "@/components/CandleChart";
import { VolumePanel } from "@/components/VolumePanel";
import { ScoreCard } from "@/components/ScoreCard";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { ExportPanel } from "@/components/ExportPanel";
import { IndicatorConfigModal } from "@/components/IndicatorConfigModal";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { MTFAlignmentCard } from "@/components/MTFAlignmentCard";
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TickerTutorial } from "@/components/TickerTutorial";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PartialDataBanner } from "@/components/PartialDataBanner";
import { StaleDataBanner } from "@/components/StaleDataBanner";
import { parseTickerInput } from "@/lib/urlParser";
import {
  loadQuote,
  loadStatus,
  loadIndex,
  tickersForTimeframe,
} from "@/lib/dataLoader";
import { validateFreshness as checkFresh } from "@/lib/validation";
import { evaluateQuote } from "@/lib/evaluation/evaluateQuote";
import {
  getEffectiveIndicatorsConfig,
  getIndicatorConfig,
} from "@/lib/configStore";
import { CandlePatternPanel } from "@/components/CandlePatternPanel";
import { SwingStructurePanel } from "@/components/SwingStructurePanel";
import { SupportResistancePanel } from "@/components/SupportResistancePanel";
import { ChartSidebar } from "@/components/ChartSidebar";
import { formatTickerLabel } from "@/lib/tickerNames";
import { getChartPatternVisibility } from "@/lib/candlePatternStore";
import { getSwingChartVisibility } from "@/lib/swingStructureStore";
import { getSrChartVisibility } from "@/lib/srZoneStore";
import {
  getBbOverlayVisibility,
  getIndicatorOverlayVisibility,
  isVolumeOverlayVisible,
} from "@/lib/indicatorOverlayStore";
import { getBbStrategyVisibility } from "@/lib/bbStrategyStore";
import { getClassicalChartPatternVisibility } from "@/lib/chartPatternStore";
import {
  getFibExtraVisibility,
  getFibLevelVisibility,
  getFibRetracement,
  isFibDrawMode,
} from "@/lib/fibonacciStore";
import { getAuxIndicatorVisibility } from "@/lib/auxIndicatorStore";
import {
  getTrendlineChartVisibility,
  getTrendlineLineColors,
  getTrendlineLineVisibility,
} from "@/lib/trendlineStore";
import { DataNotFoundError, errorMessage } from "@/lib/errors";
import type {
  BacktestResult,
  IndexFile,
  QuoteFile,
  Timeframe,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";

const VALID_TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "1w"];
type ActionMode = "fetch" | "analyze";
type Screen = "setup" | "results";

function parseTimeframeParam(value: string | null): Timeframe | null {
  if (!value) return null;
  return VALID_TIMEFRAMES.includes(value as Timeframe)
    ? (value as Timeframe)
    : null;
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const initialTicker = params.get("ticker") ?? "";
  const initialTf = parseTimeframeParam(params.get("tf"));

  const [screen, setScreen] = useState<Screen>(initialTicker ? "results" : "setup");
  const [input, setInput] = useState(initialTicker);
  const [ticker, setTicker] = useState(initialTicker);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTf ?? "1d");
  const [quote, setQuote] = useState<QuoteFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configTick, setConfigTick] = useState(0);
  const [chartVisTick, setChartVisTick] = useState(0);
  const [indicatorConfigOpen, setIndicatorConfigOpen] = useState(false);
  const [backtest, setBacktest] = useState<BacktestResult | undefined>();
  const [catalog, setCatalog] = useState<IndexFile | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("fetch");

  const catalogTickers = useMemo(
    () => (catalog ? tickersForTimeframe(catalog, timeframe) : []),
    [catalog, timeframe],
  );

  const inputParsed = useMemo(() => parseTickerInput(input), [input]);

  const refreshCatalog = useCallback(async (remote = false) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await loadIndex(remote ? { remote: true } : undefined));
    } catch (e) {
      setCatalog(null);
      setCatalogError(errorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const syncUrl = useCallback(
    (t: string, tf: Timeframe) => {
      const next = new URLSearchParams(params);
      if (t) next.set("ticker", t);
      else next.delete("ticker");
      next.set("tf", tf);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const loadData = useCallback(async (t: string, tf: Timeframe) => {
    setLoading(true);
    setLoadError(null);
    try {
      const q = await loadQuote(t, tf);
      setQuote(q);
    } catch (e) {
      setQuote(null);
      setLoadError(errorMessage(e));
    }
    try {
      await loadStatus(t, tf);
    } catch (e) {
      if (!(e instanceof DataNotFoundError)) {
        console.warn("status load:", errorMessage(e));
      }
    }
    setLoading(false);
  }, []);

  const analyze = useCallback(async () => {
    const parsed = parseTickerInput(input);
    if (!parsed.valid) return;
    setTicker(parsed.ticker);
    syncUrl(parsed.ticker, timeframe);
    setScreen("results");
    await loadData(parsed.ticker, timeframe);
  }, [input, timeframe, syncUrl, loadData]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (initialTicker && screen === "results") {
      loadData(initialTicker, initialTf ?? "1d");
    }
  }, [initialTicker, initialTf, loadData, screen]);

  useEffect(() => {
    if (screen === "results" && ticker) {
      loadData(ticker, timeframe);
    }
  }, [timeframe, ticker, loadData, screen]);

  const indicatorConfig = useMemo(
    () => getEffectiveIndicatorsConfig(),
    [configTick],
  );
  const chartPatternVisibility = useMemo(
    () => getChartPatternVisibility(),
    [chartVisTick],
  );
  const chartStructureVisibility = useMemo(
    () => getSwingChartVisibility(),
    [chartVisTick],
  );
  const chartSrVisibility = useMemo(
    () => getSrChartVisibility(),
    [chartVisTick],
  );
  const maVisibility = useMemo(() => {
    const smaPeriods =
      (getIndicatorConfig("sma")?.params.periods as number[]) ?? [];
    const emaPeriods =
      (getIndicatorConfig("ema")?.params.periods as number[]) ?? [];
    return {
      sma: getIndicatorOverlayVisibility("sma", smaPeriods),
      ema: getIndicatorOverlayVisibility("ema", emaPeriods),
    };
  }, [chartVisTick, configTick]);
  const bbVisibility = useMemo(
    () => getBbOverlayVisibility(),
    [chartVisTick],
  );
  const chartBbStrategyVisibility = useMemo(
    () => getBbStrategyVisibility(),
    [chartVisTick],
  );
  const chartClassicalPatternVisibility = useMemo(
    () => getClassicalChartPatternVisibility(),
    [chartVisTick],
  );
  const showVolume = useMemo(
    () => isVolumeOverlayVisible(),
    [chartVisTick],
  );
  const fibDrawMode = useMemo(() => isFibDrawMode(), [chartVisTick]);
  const fibRetracement = useMemo(() => getFibRetracement(), [chartVisTick]);
  const fibLevelVisibility = useMemo(
    () => getFibLevelVisibility(),
    [chartVisTick],
  );
  const fibExtraVisibility = useMemo(
    () => getFibExtraVisibility(),
    [chartVisTick],
  );
  const auxIndicatorVisibility = useMemo(
    () => getAuxIndicatorVisibility(),
    [chartVisTick],
  );
  const chartTrendlineVisibility = useMemo(
    () => getTrendlineChartVisibility(),
    [chartVisTick],
  );

  const freshness = quote ? checkFresh(quote, timeframe) : null;
  const isStale = freshness?.status === "stale";

  const evaluation = quote
    ? evaluateQuote(quote.ohlcv, timeframe, indicatorConfig)
    : null;

  const trendlineIdsKey = evaluation?.trendlines
    ? [
        ...evaluation.trendlines.ascending.map((l) => l.id),
        ...evaluation.trendlines.descending.map((l) => l.id),
      ].join("|")
    : "";
  const chartTrendlineLineVisibility = useMemo(
    () =>
      getTrendlineLineVisibility(
        trendlineIdsKey ? trendlineIdsKey.split("|") : [],
      ),
    [trendlineIdsKey, chartVisTick],
  );
  const chartTrendlineColors = useMemo(() => {
    const tl = evaluation?.trendlines;
    if (!tl) return {};
    return getTrendlineLineColors([...tl.ascending, ...tl.descending]);
  }, [trendlineIdsKey, chartVisTick]);

  const resultStatus: AnalysisStatus | "ready" = (() => {
    if (loading) return "loading";
    if (loadError || !quote) return "missing";
    if (evaluation?.fatalError) return "bad-quality";
    if (evaluation?.bars.length && evaluation) return "ready";
    return "loading";
  })();

  const staleDetail = (() => {
    if (!isStale || !freshness?.reason) return undefined;
    return `stale: ${freshness.reason} · ${quote?.barCount ?? 0} bars · last ${quote?.lastBarDate} · fetched ${quote?.fetchedAt}`;
  })();

  const statusDetail = (() => {
    if (evaluation?.fatalError) return evaluation.fatalError;
    if (quote) {
      return `${quote.barCount} bars · last ${quote.lastBarDate} · fetched ${quote.fetchedAt}`;
    }
    if (loadError) return loadError;
    return undefined;
  })();

  const backToSetup = () => {
    setScreen("setup");
  };

  return (
    <div className="space-y-6">
      <TickerTutorial />
      <h1 className="text-left text-2xl font-bold">종목 분석</h1>

      <WatchlistSidebar
        tickers={catalogTickers}
        active={ticker}
        timeframe={timeframe}
        loading={catalogLoading}
        onSelect={(t) => {
          setInput(t);
          setTicker(t);
          setScreen("setup");
          setActionMode("analyze");
          syncUrl(t, timeframe);
        }}
      />
      {catalogTickers.length > 0 && (
        <p className="text-left text-sm text-text-secondary">
          수집된 종목은{" "}
          <Link to="/browse" className="text-accent no-underline hover:underline">
            보유 데이터
          </Link>
          에서 바로 볼 수 있습니다.
        </p>
      )}

      {catalogError && (
        <ErrorBanner title="종목 목록 로드 실패" message={catalogError} />
      )}

      {screen === "setup" && (
        <>
          <TickerInput
            value={input}
            onChange={setInput}
            onSubmit={analyze}
            disabled={loading}
          />

          {inputParsed.valid && (
            <Card className="space-y-4">
              <SectionTitle>2. 작업 선택</SectionTitle>
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">
                  {formatTickerLabel(inputParsed.ticker)}
                </strong>
              </p>

              <TimeframeTabs
                value={timeframe}
                onChange={(tf) => {
                  setTimeframe(tf);
                  if (ticker) syncUrl(ticker, tf);
                }}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActionMode("fetch")}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm",
                    actionMode === "fetch"
                      ? "bg-accent text-white"
                      : "bg-surface-elevated text-text-secondary hover:text-text-primary",
                  )}
                >
                  데이터 요청
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode("analyze")}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm",
                    actionMode === "analyze"
                      ? "bg-accent text-white"
                      : "bg-surface-elevated text-text-secondary hover:text-text-primary",
                  )}
                >
                  분석하기
                </button>
              </div>

              {actionMode === "fetch" ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">
                    GitHub Issue를 열어 데이터 수집을 요청합니다.
                  </p>
                  <RequestDataButton
                    ticker={inputParsed.ticker}
                    timeframe={timeframe}
                    fresh={false}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">
                    저장된 OHLCV로 차트·지표·점수를 계산합니다.
                  </p>
                  <Button onClick={analyze} disabled={loading}>
                    분석 시작
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {screen === "results" && ticker && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-xs text-text-tertiary">분석 중</p>
              <p className="text-lg font-semibold">
                {formatTickerLabel(ticker)} · {timeframe}
              </p>
            </div>
            <Button variant="ghost" onClick={backToSetup}>
              ← 돌아가기
            </Button>
          </div>

          {resultStatus !== "ready" ? (
            <AnalysisStatusCard
              status={resultStatus}
              ticker={inputParsed.valid ? inputParsed.ticker : ticker}
              timeframe={timeframe}
              detail={statusDetail}
            />
          ) : (
            <>
              {isStale && (
                <StaleDataBanner
                  ticker={inputParsed.valid ? inputParsed.ticker : ticker}
                  timeframe={timeframe}
                  detail={staleDetail}
                />
              )}
              {evaluation!.warnings.length > 0 && (
                <PartialDataBanner warnings={evaluation!.warnings} />
              )}
              <p className="text-left text-xs text-text-tertiary">{statusDetail}</p>
              <div id="export-root" className="space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                  <div className="min-w-0 w-full flex-1">
                    <CandleChart
                      bars={evaluation!.bars}
                      timeframe={timeframe}
                      patterns={evaluation!.patterns ?? undefined}
                      chartPatternVisibility={chartPatternVisibility}
                      structure={evaluation!.structure ?? undefined}
                      chartStructureVisibility={chartStructureVisibility}
                      supportResistance={
                        evaluation!.supportResistance ?? undefined
                      }
                      chartSrVisibility={chartSrVisibility}
                      trendlines={evaluation!.trendlines ?? undefined}
                      chartTrendlineVisibility={chartTrendlineVisibility}
                      chartTrendlineLineVisibility={
                        chartTrendlineLineVisibility
                      }
                      chartTrendlineColors={chartTrendlineColors}
                      indicators={evaluation!.indicators}
                      maVisibility={maVisibility}
                      bbVisibility={bbVisibility}
                      bbStrategies={evaluation!.bbStrategies ?? undefined}
                      chartBbStrategyVisibility={chartBbStrategyVisibility}
                      classicalPatterns={
                        evaluation!.classicalPatterns ?? undefined
                      }
                      chartClassicalPatternVisibility={
                        chartClassicalPatternVisibility
                      }
                      showVolume={showVolume}
                      fibDrawMode={fibDrawMode}
                      fibRetracement={fibRetracement}
                      fibLevelVisibility={fibLevelVisibility}
                      fibExtraVisibility={fibExtraVisibility}
                      auxIndicatorVisibility={auxIndicatorVisibility}
                      onFibChange={() => setChartVisTick((n) => n + 1)}
                    />
                  </div>
                  <ChartSidebar
                    visibilityTick={chartVisTick}
                    onVisibilityChange={() => setChartVisTick((n) => n + 1)}
                    onOpenIndicatorConfig={() => setIndicatorConfigOpen(true)}
                    trendlines={evaluation!.trendlines}
                  />
                </div>
                <IndicatorConfigModal
                  open={indicatorConfigOpen}
                  onClose={() => setIndicatorConfigOpen(false)}
                  onChange={() => setConfigTick((n) => n + 1)}
                />
                <div className="grid gap-6 xl:grid-cols-2">
                  <VolumePanel snapshot={evaluation!.volume} />
                  {evaluation!.score && <ScoreCard score={evaluation!.score} />}
                  <IndicatorPanel results={evaluation!.indicators} />
                  {evaluation!.structure && (
                    <SwingStructurePanel structure={evaluation!.structure} />
                  )}
                  {evaluation!.supportResistance && (
                    <SupportResistancePanel
                      sr={evaluation!.supportResistance}
                    />
                  )}
                  {evaluation!.patterns && (
                    <CandlePatternPanel patterns={evaluation!.patterns} />
                  )}
                </div>
                <MTFAlignmentCard alignment={evaluation!.mtf} />
                <StrategyBuilder bars={evaluation!.bars} onResult={setBacktest} />
                <ExportPanel
                  quote={quote!}
                  indicators={evaluation!.indicators}
                  score={evaluation!.score ?? undefined}
                  patterns={evaluation!.patterns ?? undefined}
                  backtest={backtest}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
