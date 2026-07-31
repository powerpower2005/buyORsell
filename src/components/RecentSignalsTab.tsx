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
import { ErrorBanner } from "@/components/ErrorBanner";

interface TickerSignals {
  ticker: string;
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
  const [rows, setRows] = useState<TickerSignals[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const entryKey = useMemo(
    () => entries.map((e) => `${e.ticker}:${e.timeframe}`).join("|"),
    [entries],
  );

  useEffect(() => {
    if (!entries.length) {
      setRows([]);
      setScanError(null);
      setScanning(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setScanning(true);
      setScanError(null);
      const indicatorConfig = getEffectiveIndicatorsConfig();
      const trendlineAlgo = getTrendlineAlgoVersion();
      const next: TickerSignals[] = [];

      try {
        for (const entry of entries) {
          if (cancelled) return;
          try {
            const quote = await loadQuote(
              entry.ticker,
              entry.timeframe as Timeframe,
            );
            const evaluation = evaluateQuote(
              quote.ohlcv,
              entry.timeframe as Timeframe,
              indicatorConfig,
              { trendlineAlgo },
            );
            if (evaluation.fatalError) {
              next.push({
                ticker: entry.ticker,
                hits: [],
                error: evaluation.fatalError,
              });
              continue;
            }
            const hits = recentHitsFromEvaluation(
              evaluation,
              RECENT_SIGNAL_WINDOW_BARS,
            );
            if (hits.length) next.push({ ticker: entry.ticker, hits });
          } catch (e) {
            next.push({
              ticker: entry.ticker,
              hits: [],
              error: errorMessage(e),
            });
          }
        }
        if (!cancelled) setRows(next);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setScanError(errorMessage(e));
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entryKey, entries]);

  const withHits = rows.filter((r) => r.hits.length > 0);
  const withErrors = rows.filter((r) => r.error);

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <SectionTitle>최근 {RECENT_SIGNAL_WINDOW_BARS}봉 시그널</SectionTitle>
        <p className="text-sm text-text-secondary">
          보유 데이터({timeframe})에서 매수(상승)·매도(하락) 전략 히트가 최근{" "}
          {RECENT_SIGNAL_WINDOW_BARS}봉 안에 난 종목만 모읍니다.
        </p>
      </Card>

      {scanError && (
        <ErrorBanner title="시그널 스캔 실패" message={scanError} />
      )}

      {loadingIndex || scanning ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {loadingIndex ? "목록 로딩 중…" : "종목별 시그널 스캔 중…"}
          </p>
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
      ) : !withHits.length ? (
        <Card>
          <p className="text-sm text-text-secondary">
            최근 {RECENT_SIGNAL_WINDOW_BARS}봉 안에 매수·매도 시그널이 있는 종목이
            없습니다.
          </p>
          {withErrors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-negative">
              {withErrors.map((r) => (
                <li key={r.ticker}>
                  {formatTickerLabel(r.ticker)}: {r.error}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <ul className="space-y-3">
          {withHits.map((row) => (
            <li key={row.ticker}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {onTickerSelect ? (
                    <button
                      type="button"
                      onClick={() => onTickerSelect(row.ticker)}
                      className="text-left text-base font-semibold text-text-primary hover:text-accent"
                    >
                      {formatTickerLabel(row.ticker)}
                    </button>
                  ) : (
                    <Link
                      to={tickerHref(row.ticker, timeframe)}
                      className="text-base font-semibold text-text-primary no-underline hover:text-accent"
                    >
                      {formatTickerLabel(row.ticker)}
                    </Link>
                  )}
                  <span className="text-xs text-text-tertiary">
                    {row.hits.length}개 · {timeframe}
                  </span>
                </div>
                <ul className="space-y-2">
                  {row.hits.map((h) => (
                    <li
                      key={`${h.family}:${h.id}`}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <Badge
                        variant={
                          h.direction === "bullish" ? "positive" : "negative"
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
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
