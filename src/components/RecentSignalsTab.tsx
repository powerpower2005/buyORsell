import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadQuote } from "@/lib/dataLoader";
import { evaluateQuote } from "@/lib/evaluation/evaluateQuote";
import { getEffectiveIndicatorsConfig } from "@/lib/configStore";
import { getTrendlineAlgoVersion } from "@/lib/trendlineStore";
import {
  RECENT_SIGNAL_WINDOW_BARS,
  recentHitsFromEvaluation,
  type RecentStrategyHit,
} from "@/lib/recentSignals";
import { formatStrategyRecencyLabel } from "@/lib/strategyRecency";
import { formatTickerLabel } from "@/lib/tickerNames";
import { errorMessage } from "@/lib/errors";
import type { IndexEntry, Timeframe } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";

interface CachedSignals {
  hits: RecentStrategyHit[];
  error?: string;
}

export function RecentSignalsTab({
  entries,
  timeframe,
  loadingIndex,
  tickerHref = (ticker, tf) =>
    `/browse?ticker=${encodeURIComponent(ticker)}&tf=${tf}`,
  onTickerSelect,
}: {
  entries: IndexEntry[];
  timeframe: Timeframe;
  loadingIndex: boolean;
  tickerHref?: (ticker: string, timeframe: Timeframe) => string;
  onTickerSelect?: (ticker: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, CachedSignals>>({});
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);

  const entryKey = useMemo(
    () => entries.map((e) => `${e.ticker}:${e.timeframe}`).join("|"),
    [entries],
  );

  useEffect(() => {
    setSelected(null);
    setCache({});
    setLoadingTicker(null);
  }, [entryKey]);

  const loadSignals = async (ticker: string) => {
    if (cache[ticker] || loadingTicker === ticker) return;
    const entry = entries.find((e) => e.ticker === ticker);
    if (!entry) return;

    setLoadingTicker(ticker);
    try {
      const quote = await loadQuote(entry.ticker, entry.timeframe as Timeframe);
      const evaluation = evaluateQuote(
        quote.ohlcv,
        entry.timeframe as Timeframe,
        getEffectiveIndicatorsConfig(),
        { trendlineAlgo: getTrendlineAlgoVersion() },
      );
      if (evaluation.fatalError) {
        const fatal = evaluation.fatalError;
        setCache((prev) => ({
          ...prev,
          [ticker]: { hits: [], error: fatal },
        }));
        return;
      }
      setCache((prev) => ({
        ...prev,
        [ticker]: {
          hits: recentHitsFromEvaluation(
            evaluation,
            RECENT_SIGNAL_WINDOW_BARS,
          ),
        },
      }));
    } catch (e) {
      setCache((prev) => ({
        ...prev,
        [ticker]: { hits: [], error: errorMessage(e) },
      }));
    } finally {
      setLoadingTicker((cur) => (cur === ticker ? null : cur));
    }
  };

  const toggleTicker = (ticker: string) => {
    if (selected === ticker) {
      setSelected(null);
      return;
    }
    setSelected(ticker);
    void loadSignals(ticker);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <SectionTitle>최근 {RECENT_SIGNAL_WINDOW_BARS}봉 시그널</SectionTitle>
        <p className="text-sm text-text-secondary">
          종목을 누르면 저장된 OHLCV로 최근 {RECENT_SIGNAL_WINDOW_BARS}봉
          매수·매도 시그널을 계산합니다. 실시간 시세가 아닙니다.
        </p>
      </Card>

      {loadingIndex ? (
        <Card>
          <p className="text-sm text-text-secondary">목록 로딩 중…</p>
        </Card>
      ) : !entries.length ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {timeframe} 데이터가 없습니다.{" "}
            <Link to="/" className="text-accent">
              홈
            </Link>
            에서 수집을 요청하세요.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const open = selected === entry.ticker;
            const row = cache[entry.ticker];
            const loading = loadingTicker === entry.ticker;
            return (
              <li key={entry.ticker}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTicker(entry.ticker)}
                      className="text-left text-base font-semibold text-text-primary hover:text-accent"
                    >
                      {open ? "▾ " : "▸ "}
                      {formatTickerLabel(entry.ticker)}
                    </button>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-tertiary">{timeframe}</span>
                      {onTickerSelect ? (
                        <button
                          type="button"
                          onClick={() => onTickerSelect(entry.ticker)}
                          className="text-accent hover:underline"
                        >
                          분석
                        </button>
                      ) : (
                        <Link
                          to={tickerHref(entry.ticker, timeframe)}
                          className="text-accent no-underline hover:underline"
                        >
                          분석
                        </Link>
                      )}
                    </div>
                  </div>

                  {open && (
                    <>
                      {loading && (
                        <p className="text-sm text-text-secondary">
                          시그널 계산 중…
                        </p>
                      )}
                      {!loading && row?.error && (
                        <p className="text-sm text-negative">{row.error}</p>
                      )}
                      {!loading && row && !row.error && !row.hits.length && (
                        <p className="text-sm text-text-secondary">
                          최근 {RECENT_SIGNAL_WINDOW_BARS}봉 안에 매수·매도
                          시그널 없음
                        </p>
                      )}
                      {!loading && row && row.hits.length > 0 && (
                        <ul className="space-y-2">
                          {row.hits.map((h) => (
                            <li
                              key={`${h.family}:${h.id}`}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <Badge
                                variant={
                                  h.direction === "bullish"
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {h.direction === "bullish" ? "매수" : "매도"}
                              </Badge>
                              <span className="font-medium">{h.label}</span>
                              <span className="text-text-tertiary">
                                {formatStrategyRecencyLabel({
                                  date: h.date,
                                  barIndex: h.barIndex,
                                  barsAgo: h.barsAgo,
                                  direction: h.direction,
                                  close: h.close,
                                })}
                              </span>
                              <span className="tabular-nums text-text-tertiary">
                                {h.date}
                              </span>
                              {h.rrLabel && (
                                <Badge variant="muted">{h.rrLabel}</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
