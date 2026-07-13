import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { loadIndex, loadQuote } from "@/lib/dataLoader";
import { validateFreshness } from "@/lib/validation";
import { evaluateQuote } from "@/lib/evaluation/evaluateQuote";
import { getEffectiveIndicatorsConfig } from "@/lib/configStore";
import { ConfigPanel } from "@/components/ConfigPanel";
import { CandlePatternPanel } from "@/components/CandlePatternPanel";
import { getChartPatternVisibility } from "@/lib/candlePatternStore";
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
  const [patternChartTick, setPatternChartTick] = useState(0);

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
    [patternChartTick],
  );

  const freshness = quote && selected
    ? validateFreshness(quote, selected.timeframe as Timeframe)
    : null;
  const isStale = freshness?.status === "stale";

  const evaluation =
    quote && selected
      ? evaluateQuote(
          quote.ohlcv,
          selected.timeframe as Timeframe,
          indicatorConfig,
        )
      : null;

  const resultStatus: AnalysisStatus | "ready" = (() => {
    if (loading) return "loading";
    if (loadError || !quote) return "missing";
    if (evaluation?.fatalError) return "bad-quality";
    if (quote.ohlcv.length > 0 && evaluation) return "ready";
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <Card>
          <SectionTitle>수집된 종목</SectionTitle>
          {!entries.length ? (
            <p className="text-sm text-text-secondary">
              {timeframe} 데이터가 없습니다.{" "}
              <Link to="/" className="text-accent">
                홈
              </Link>
              에서 Issue로 수집을 요청하세요.
            </p>
          ) : (
            <ul className="space-y-1">
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
                      <span className="font-medium">{e.ticker}</span>
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

        <div className="space-y-4">
          {!selected ? (
            <Card>
              <p className="text-sm text-text-secondary">왼쪽에서 종목을 선택하세요.</p>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{selected.ticker}</h2>
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
                  <CandleChart
                    bars={quote!.ohlcv}
                    timeframe={selected.timeframe as Timeframe}
                    patterns={evaluation!.patterns ?? undefined}
                    chartPatternVisibility={chartPatternVisibility}
                    indicators={evaluation!.indicators}
                  />
                  <div className="grid gap-6 xl:grid-cols-2">
                    <VolumePanel
                      snapshot={evaluation!.volume}
                      timeframe={selected.timeframe as Timeframe}
                    />
                    {evaluation!.score && <ScoreCard score={evaluation!.score} />}
                    <IndicatorPanel results={evaluation!.indicators} />
                    {evaluation!.patterns && (
                      <CandlePatternPanel
                        patterns={evaluation!.patterns}
                        chartVisibility={chartPatternVisibility}
                        onChartVisibilityChange={() =>
                          setPatternChartTick((n) => n + 1)
                        }
                      />
                    )}
                  </div>
                  <ConfigPanel onChange={() => setConfigTick((n) => n + 1)} />
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
