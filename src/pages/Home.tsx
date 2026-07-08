import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { TickerInput } from "@/components/TickerInput";
import { Card, SectionTitle } from "@/components/ui/Card";

import { TimeframeTabs } from "@/components/TimeframeTabs";

import { RequestDataButton } from "@/components/RequestDataButton";

import { FetchStatusBanner } from "@/components/FetchStatusBanner";

import { CandleChart } from "@/components/CandleChart";

import { VolumePanel } from "@/components/VolumePanel";

import { ScoreCard } from "@/components/ScoreCard";

import { IndicatorPanel } from "@/components/IndicatorPanel";

import { ConfigPanel } from "@/components/ConfigPanel";

import { ExportPanel } from "@/components/ExportPanel";

import { WatchlistSidebar } from "@/components/WatchlistSidebar";

import { MTFAlignmentCard } from "@/components/MTFAlignmentCard";

import { StrategyBuilder } from "@/components/StrategyBuilder";

import { TickerTutorial } from "@/components/TickerTutorial";

import { ErrorBanner } from "@/components/ErrorBanner";

import { parseTickerInput } from "@/lib/urlParser";

import { loadQuote, loadStatus, loadIndex, pollUntilReady, tickersForTimeframe } from "@/lib/dataLoader";

import { validateFreshness as checkFresh } from "@/lib/validation";

import { computeAll } from "@/lib/evaluation/registry";

import { computeScore, presetForTimeframe } from "@/lib/evaluation/scoring";

import { computeMTFAlignment } from "@/lib/evaluation/mtfAlignment";

import { getEffectiveIndicatorsConfig } from "@/lib/configStore";

import { computeVolumeAverages, getVolumeMaPeriods } from "@/lib/evaluation/volumeMa";
import { detectCandlePatterns } from "@/lib/evaluation/candlePatterns";
import { CandlePatternPanel } from "@/components/CandlePatternPanel";

import { DataNotFoundError, errorMessage } from "@/lib/errors";

import type {
  BacktestResult,
  IndexFile,
  QuoteFile,
  StatusFile,
  Timeframe,
} from "@/lib/types";

import { Button } from "@/components/ui/Button";



const VALID_TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "1w"];



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



  const [input, setInput] = useState(initialTicker);

  const [ticker, setTicker] = useState(initialTicker);

  const [timeframe, setTimeframe] = useState<Timeframe>(initialTf ?? "1d");

  const [quote, setQuote] = useState<QuoteFile | null>(null);

  const [status, setStatus] = useState<StatusFile | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusError, setStatusError] = useState<string | null>(null);

  const [pollError, setPollError] = useState<string | null>(null);

  const [polling, setPolling] = useState(false);

  const [loading, setLoading] = useState(false);

  const [configTick, setConfigTick] = useState(0);

  const [backtest, setBacktest] = useState<BacktestResult | undefined>();
  const [catalog, setCatalog] = useState<IndexFile | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const catalogTickers = useMemo(
    () => (catalog ? tickersForTimeframe(catalog, timeframe) : []),
    [catalog, timeframe],
  );

  const inputParsed = useMemo(() => parseTickerInput(input), [input]);
  const analyzed =
    Boolean(ticker) && inputParsed.valid && ticker === inputParsed.ticker;
  const activeQuote =
    quote?.ticker === inputParsed.ticker && quote?.timeframe === timeframe
      ? quote
      : null;
  const freshForInput = activeQuote
    ? checkFresh(activeQuote, timeframe).status === "fresh"
    : false;
  const dataReady = analyzed && freshForInput;
  const needsFetch =
    analyzed && !loading && (Boolean(loadError) || (activeQuote ? !freshForInput : true));

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await loadIndex());
    } catch (e) {
      setCatalog(null);
      setCatalogError(errorMessage(e));
    } finally {
      setCatalogLoading(false);
    }
  }, []);



  const fresh = freshForInput;



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

    setStatusError(null);

    try {

      const q = await loadQuote(t, tf);

      setQuote(q);

    } catch (e) {

      setQuote(null);

      setLoadError(errorMessage(e));

    }



    try {

      const st = await loadStatus(t, tf);

      setStatus(st);

    } catch (e) {

      setStatus(null);

      if (e instanceof DataNotFoundError) {

        setStatusError(errorMessage(e));

      } else {

        setStatusError(errorMessage(e));

      }

    }



    setLoading(false);

  }, []);



  const analyze = useCallback(async () => {

    const parsed = parseTickerInput(input);

    if (!parsed.valid) return;

    setTicker(parsed.ticker);
    syncUrl(parsed.ticker, timeframe);
    await loadData(parsed.ticker, timeframe);
  }, [input, timeframe, syncUrl, loadData]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {

    if (initialTicker) {

      loadData(initialTicker, initialTf ?? "1d");

    }

  }, [initialTicker, initialTf, loadData]);



  useEffect(() => {

    if (ticker) loadData(ticker, timeframe);

  }, [timeframe, ticker, loadData]);



  const startPolling = async () => {

    if (!ticker) return;

    setPolling(true);

    setPollError(null);

    try {

      const q = await pollUntilReady(ticker, timeframe, (q, st) => {

        setQuote(q);

        setStatus(st);

        setLoadError(null);

      });

      setQuote(q);
      await refreshCatalog();
    } catch (e) {

      setPollError(errorMessage(e));

    }

    setPolling(false);

  };



  const indicatorConfig = useMemo(

    () => getEffectiveIndicatorsConfig(),

    [configTick],

  );



  let evaluation: {

    indicators: ReturnType<typeof computeAll>;

    score: ReturnType<typeof computeScore>;

    mtf: ReturnType<typeof computeMTFAlignment>;

    volume: ReturnType<typeof computeVolumeAverages>;
    patterns: ReturnType<typeof detectCandlePatterns>;
  } | null = null;

  let evaluationError: string | null = null;



  if (dataReady && activeQuote) {

    try {

      const indicators = computeAll(activeQuote.ohlcv, timeframe, indicatorConfig);

      const score = computeScore(

        activeQuote.ohlcv,

        indicators,

        presetForTimeframe(timeframe),

      );

      const mtf = computeMTFAlignment({ [timeframe]: indicators });

      const volume = computeVolumeAverages(
        activeQuote.ohlcv,
        getVolumeMaPeriods(timeframe),
      );
      const patterns = detectCandlePatterns(activeQuote.ohlcv);

      evaluation = { indicators, score, mtf, volume, patterns };

    } catch (e) {

      evaluationError = errorMessage(e);

    }

  }



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
          syncUrl(t, timeframe);
          loadData(t, timeframe);
        }}
      />

      {catalogError && (
        <ErrorBanner title="종목 목록 로드 실패" message={catalogError} />
      )}

      <Card>
        <SectionTitle>1. 종목 · 타임프레임</SectionTitle>
        <TickerInput value={input} onChange={setInput} />
        {inputParsed.valid && (
          <div className="mt-4">
            <TimeframeTabs
              value={timeframe}
              onChange={(tf) => {
                setTimeframe(tf);
                if (ticker) syncUrl(ticker, tf);
              }}
            />
          </div>
        )}
      </Card>

      {inputParsed.valid && !analyzed && (
        <Card>
          <SectionTitle>2. 분석</SectionTitle>
          <p className="mb-4 text-sm text-text-secondary">
            저장된 OHLCV가 있으면 차트와 지표를 표시합니다.
          </p>
          <Button onClick={analyze} disabled={loading}>
            {loading ? "로딩 중…" : "분석 시작"}
          </Button>
        </Card>
      )}

      {analyzed && needsFetch && (
        <Card>
          <SectionTitle>2. 데이터 수집</SectionTitle>
          <p className="mb-4 text-sm text-text-secondary">
            <strong className="text-text-primary">{inputParsed.ticker}</strong> ·{" "}
            {timeframe} 데이터가 없거나 오래되었습니다. Issue를 제출한 뒤 polling으로
            갱신을 기다리세요.
          </p>
          <RequestDataButton
            ticker={inputParsed.ticker}
            timeframe={timeframe}
            status={status?.status}
            fresh={fresh}
            polling={polling}
            showPolling={!loadError}
            onStartPolling={startPolling}
          />
          {pollError && (
            <p className="mt-3 text-sm text-negative">{pollError}</p>
          )}
        </Card>
      )}

      {analyzed && dataReady && activeQuote && (
        <Card>
          <SectionTitle>2. 데이터</SectionTitle>
          <FetchStatusBanner
            polling={polling}
            message={`${activeQuote.barCount} bars · last ${activeQuote.lastBarDate} · ${activeQuote.source ?? "unknown"}${activeQuote.resolvedSymbol ? ` (${activeQuote.resolvedSymbol})` : ""} · fetched ${activeQuote.fetchedAt}`}
          />
        </Card>
      )}

      {analyzed && loading && !activeQuote && (
        <Card>
          <SectionTitle>2. 분석</SectionTitle>
          <p className="text-sm text-text-secondary">데이터 불러오는 중…</p>
        </Card>
      )}

      {analyzed && needsFetch && loadError && (
        <ErrorBanner title="시세 데이터 없음" message={loadError} />
      )}

      {analyzed && needsFetch && statusError && !loadError && (
        <ErrorBanner title="Fetch 상태 없음" message={statusError} />
      )}

      {evaluationError && (

        <ErrorBanner title="평가 계산 실패" message={evaluationError} />

      )}



      {dataReady && activeQuote && evaluation && (
        <div id="export-root" className="space-y-6">
          <h2 className="text-left text-lg font-semibold">3. 분석 결과</h2>

          <CandleChart bars={activeQuote.ohlcv} timeframe={timeframe} />

          <VolumePanel snapshot={evaluation.volume} timeframe={timeframe} />

          <ScoreCard score={evaluation.score} />

          <IndicatorPanel results={evaluation.indicators} />
          <CandlePatternPanel patterns={evaluation.patterns} />
          <MTFAlignmentCard alignment={evaluation.mtf} />

          <StrategyBuilder bars={activeQuote.ohlcv} onResult={setBacktest} />

          <ConfigPanel onChange={() => setConfigTick((n) => n + 1)} />

          <ExportPanel
            quote={activeQuote}
            indicators={evaluation.indicators}
            score={evaluation.score}
            patterns={evaluation.patterns}
            backtest={backtest}
          />

        </div>

      )}

    </div>

  );

}

