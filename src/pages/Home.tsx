import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { TickerInput } from "@/components/TickerInput";

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



  const fresh = quote ? checkFresh(quote, timeframe).status === "fresh" : false;



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



  if (quote) {

    try {

      const indicators = computeAll(quote.ohlcv, timeframe, indicatorConfig);

      const score = computeScore(

        quote.ohlcv,

        indicators,

        presetForTimeframe(timeframe),

      );

      const mtf = computeMTFAlignment({ [timeframe]: indicators });

      const volume = computeVolumeAverages(
        quote.ohlcv,
        getVolumeMaPeriods(timeframe),
      );
      const patterns = detectCandlePatterns(quote.ohlcv, {
        unreliableSource: quote.source === "batchexecute",
      });

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



      <TickerInput

        value={input}

        onChange={setInput}

        onSubmit={analyze}

        disabled={loading}

      />



      {ticker && (

        <>

          <TimeframeTabs

            value={timeframe}

            onChange={(tf) => {

              setTimeframe(tf);

              syncUrl(ticker, tf);

            }}

          />



          {loadError && (

            <ErrorBanner title="시세 데이터 없음" message={loadError} />

          )}

          {statusError && !loadError && (

            <ErrorBanner title="Fetch 상태 없음" message={statusError} />

          )}

          {pollError && (

            <ErrorBanner title="Polling 실패" message={pollError} />

          )}



          <RequestDataButton

            ticker={ticker}

            timeframe={timeframe}

            status={status?.status}

            fresh={fresh}

            polling={polling}

          />



          {!fresh && ticker && !loadError && (

            <Button variant="secondary" onClick={startPolling} disabled={polling}>

              {polling ? "Polling…" : "데이터 갱신 polling 시작"}

            </Button>

          )}



          <FetchStatusBanner

            polling={polling}

            message={

              quote

                ? `${quote.barCount} bars · last ${quote.lastBarDate} · ${quote.source ?? "unknown"}${quote.resolvedSymbol ? ` (${quote.resolvedSymbol})` : ""} · fetched ${quote.fetchedAt}`

                : loading

                  ? "로딩 중…"

                  : loadError ?? "데이터 없음"

            }

          />

        </>

      )}



      {evaluationError && (

        <ErrorBanner title="평가 계산 실패" message={evaluationError} />

      )}



      {quote && evaluation && (

        <div id="export-root" className="space-y-6">

          <CandleChart bars={quote.ohlcv} timeframe={timeframe} />

          <VolumePanel snapshot={evaluation.volume} timeframe={timeframe} />

          <ScoreCard score={evaluation.score} />

          <IndicatorPanel results={evaluation.indicators} />
          <CandlePatternPanel patterns={evaluation.patterns} />
          <MTFAlignmentCard alignment={evaluation.mtf} />

          <StrategyBuilder bars={quote.ohlcv} onResult={setBacktest} />

          <ConfigPanel onChange={() => setConfigTick((n) => n + 1)} />

          <ExportPanel
            quote={quote}
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

