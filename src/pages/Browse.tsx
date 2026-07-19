import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import {
  isBrowseTickerListCollapsed,
  setBrowseTickerListCollapsed,
} from "@/lib/sidebarOpenStore";
import { loadIndex, loadQuote } from "@/lib/dataLoader";
import { validateFreshness } from "@/lib/validation";
import { evaluateQuote } from "@/lib/evaluation/evaluateQuote";
import {
  getEffectiveIndicatorsConfig,
  getIndicatorConfig,
} from "@/lib/configStore";
import { CandlePatternPanel } from "@/components/CandlePatternPanel";
import { SwingStructurePanel } from "@/components/SwingStructurePanel";
import { SupportResistancePanel } from "@/components/SupportResistancePanel";
import { ChartSidebar } from "@/components/ChartSidebar";
import { IndicatorConfigModal } from "@/components/IndicatorConfigModal";
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
import {
  AnalysisStatusCard,
  type AnalysisStatus,
} from "@/components/AnalysisStatusCard";
import { CandleChart } from "@/components/CandleChart";
import { VolumePanel } from "@/components/VolumePanel";
import { ScoreCard } from "@/components/ScoreCard";
import { IndicatorPanel } from "@/components/IndicatorPanel";
import { MTFAlignmentCard } from "@/components/MTFAlignmentCard";
import { TimeframeTabs } from "@/components/TimeframeTabs";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PartialDataBanner } from "@/components/PartialDataBanner";
import { StaleDataBanner } from "@/components/StaleDataBanner";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { errorMessage } from "@/lib/errors";
import type { IndexEntry, IndexFile, QuoteFile, Timeframe } from "@/lib/types";

const VALID_TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "1w"];

function parseTf(value: string | null): Timeframe {
  if (value && VALID_TIMEFRAMES.includes(value as Timeframe)) {
    return value as Timeframe;
  }
  return "1d";
}

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(() => parseTf(params.get("tf")));
  const [selected, setSelected] = useState<IndexEntry | null>(null);
  const [quote, setQuote] = useState<QuoteFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configTick, setConfigTick] = useState(0);
  const [chartVisTick, setChartVisTick] = useState(0);
  const [indicatorConfigOpen, setIndicatorConfigOpen] = useState(false);
  const [tickerListCollapsed, setTickerListCollapsed] = useState(() =>
    isBrowseTickerListCollapsed(),
  );

  const setTickerListCollapsedPersisted = (next: boolean) => {
    setBrowseTickerListCollapsed(next);
    setTickerListCollapsed(next);
  };

  const entries = useMemo(
    () =>
      (index?.entries ?? [])
        .filter((e) => e.timeframe === timeframe)
        .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt)),
    [index, timeframe],
  );

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setIndexError(errorMessage(e)));
  }, []);

  useEffect(() => {
    const urlTicker = params.get("ticker");
    const urlTf = parseTf(params.get("tf"));
    if (urlTf !== timeframe) setTimeframe(urlTf);

    if (!index?.entries.length) return;

    const match =
      index.entries.find(
        (e) => e.ticker === urlTicker && e.timeframe === urlTf,
      ) ??
      index.entries.find((e) => e.timeframe === urlTf) ??
      index.entries.find((e) => e.timeframe === "1d") ??
      null;

    setSelected(match);
  }, [index, params, timeframe]);

  useEffect(() => {
    if (!selected) {
      setQuote(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const q = await loadQuote(selected.ticker, selected.timeframe as Timeframe);
        if (!cancelled) setQuote(q);
      } catch (e) {
        if (!cancelled) {
          setQuote(null);
          setLoadError(errorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

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
    [chartVisTick, configTick],
  );
  const chartTrendlineVisibility = useMemo(
    () => getTrendlineChartVisibility(),
    [chartVisTick],
  );

  const freshness = quote && selected
    ? validateFreshness(quote, selected.timeframe as Timeframe)
    : null;
  const isStale = freshness?.status === "stale";

  const evaluation = useMemo(
    () =>
      quote && selected
        ? evaluateQuote(
            quote.ohlcv,
            selected.timeframe as Timeframe,
            indicatorConfig,
          )
        : null,
    [quote, selected?.ticker, selected?.timeframe, indicatorConfig],
  );

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
    return loadError ?? undefined;
  })();

  const selectEntry = (entry: IndexEntry) => {
    setSelected(entry);
    const next = new URLSearchParams(params);
    next.set("ticker", entry.ticker);
    next.set("tf", entry.timeframe);
    setParams(next, { replace: true });
  };

  const onTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    const next = new URLSearchParams(params);
    next.set("tf", tf);
    const first = index?.entries.find((e) => e.timeframe === tf);
    if (first) {
      next.set("ticker", first.ticker);
      setSelected(first);
    } else {
      next.delete("ticker");
      setSelected(null);
    }
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">보유 데이터</h1>
          <p className="mt-1 text-sm text-text-secondary">
            이미 수집된 종목을 입력 없이 바로 확인합니다.
          </p>
        </div>
        <Link to="/" className="text-sm text-accent no-underline hover:underline">
          직접 입력해서 분석 →
        </Link>
      </div>

      {indexError && <ErrorBanner title="목록 로드 실패" message={indexError} />}

      <Card className="space-y-4">
        <SectionTitle>타임프레임</SectionTitle>
        <TimeframeTabs value={timeframe} onChange={onTimeframeChange} />
      </Card>

      <div
        className={clsx(
          "grid gap-6",
          tickerListCollapsed
            ? "lg:grid-cols-[auto_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]",
        )}
      >
        {tickerListCollapsed ? (
          <aside className="lg:sticky lg:top-4">
            <button
              type="button"
              className="rounded-xl border border-border bg-surface px-2.5 py-3 text-[11px] font-medium text-text-secondary shadow-sm hover:border-accent/40 hover:text-text-primary lg:[writing-mode:vertical-rl]"
              onClick={() => setTickerListCollapsedPersisted(false)}
              title="수집된 종목 펼치기"
            >
              수집된 종목
            </button>
          </aside>
        ) : (
          <Card className="lg:sticky lg:top-4 lg:self-start">
            <div className="mb-3 flex items-start justify-between gap-2">
              <SectionTitle>수집된 종목</SectionTitle>
              <button
                type="button"
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-tertiary hover:border-accent/40 hover:text-text-primary"
                onClick={() => setTickerListCollapsedPersisted(true)}
                title="수집된 종목 접기"
              >
                접기
              </button>
            </div>
            {!entries.length ? (
              <p className="text-sm text-text-secondary">
                {timeframe} 데이터가 없습니다.{" "}
                <Link to="/" className="text-accent">
                  홈
                </Link>
                에서 Issue로 수집을 요청하세요.
              </p>
            ) : (
              <ul className="max-h-[min(70vh,640px)] space-y-1 overflow-y-auto">
                {entries.map((e) => {
                  const active =
                    selected?.ticker === e.ticker &&
                    selected?.timeframe === e.timeframe;
                  return (
                    <li key={`${e.ticker}-${e.timeframe}`}>
                      <button
                        type="button"
                        onClick={() => selectEntry(e)}
                        className={clsx(
                          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-accent text-white"
                            : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
                        )}
                      >
                        <span className="font-medium">
                          {formatTickerLabel(e.ticker)}
                        </span>
                        <span
                          className={clsx(
                            "mt-0.5 block text-xs",
                            active ? "text-white/80" : "text-text-tertiary",
                          )}
                        >
                          {e.barCount} bars · {e.lastBarDate}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        <div className="min-w-0 space-y-4">
          {!selected ? (
            <Card>
              <p className="text-sm text-text-secondary">왼쪽에서 종목을 선택하세요.</p>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {formatTickerLabel(selected.ticker)}
                </h2>
                <span className="text-sm text-text-tertiary">{selected.timeframe}</span>
                {freshness && (
                  <Badge variant={freshness.status === "fresh" ? "fresh" : "stale"}>
                    {freshness.status}
                  </Badge>
                )}
              </div>

              {resultStatus !== "ready" ? (
                <AnalysisStatusCard
                  status={resultStatus}
                  ticker={selected.ticker}
                  timeframe={selected.timeframe}
                  detail={statusDetail}
                />
              ) : (
                <div className="space-y-6">
                  {isStale && (
                    <StaleDataBanner
                      ticker={selected.ticker}
                      timeframe={selected.timeframe}
                      detail={staleDetail}
                    />
                  )}
                  {evaluation!.warnings.length > 0 && (
                    <PartialDataBanner warnings={evaluation!.warnings} />
                  )}
                  <p className="text-xs text-text-tertiary">{statusDetail}</p>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                    <div className="min-w-0 w-full flex-1">
                      <CandleChart
                        bars={evaluation!.bars}
                        timeframe={selected.timeframe as Timeframe}
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
                      configTick={configTick}
                      onVisibilityChange={() => setChartVisTick((n) => n + 1)}
                      onOpenIndicatorConfig={() => setIndicatorConfigOpen(true)}
                      trendlines={evaluation!.trendlines}
                    />
                  </div>
                  <IndicatorConfigModal
                    open={indicatorConfigOpen}
                    onClose={() => setIndicatorConfigOpen(false)}
                    onChange={() => {
                      setConfigTick((n) => n + 1);
                      setChartVisTick((n) => n + 1);
                    }}
                    runtimeWarnings={evaluation?.warnings ?? []}
                  />
                  <div className="grid gap-6 xl:grid-cols-2">
                    <VolumePanel
                      snapshot={evaluation!.volume}
                      timeframe={selected.timeframe as Timeframe}
                    />
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
