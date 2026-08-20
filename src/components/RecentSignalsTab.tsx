import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadQuote } from "@/lib/dataLoader";
import { evaluateQuote } from "@/lib/evaluation/evaluateQuote";
import { getEffectiveIndicatorsConfig } from "@/lib/configStore";
import { getTrendlineAlgoVersion } from "@/lib/trendlineStore";
import {
  RECENT_SIGNAL_DISPLAY_OPTIONS,
  RECENT_SIGNAL_SCAN_BARS,
  RECENT_SIGNAL_TIMEFRAME,
  filterHitsByDisplayBars,
  getRecentSignalDisplayBars,
  recentHitsFromEvaluation,
  recentSignalWindowLabel,
  setRecentSignalDisplayBars,
  type RecentSignalDisplayBars,
  type RecentStrategyHit,
} from "@/lib/recentSignals";
import { formatStrategyRecencyLabel } from "@/lib/strategyRecency";
import { formatTickerLabel } from "@/lib/tickerNames";
import { errorMessage } from "@/lib/errors";
import type { IndexEntry } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";

interface CachedSignals {
  hits: RecentStrategyHit[];
  error?: string;
}

const SCAN_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function freshestBarsAgo(hits: RecentStrategyHit[]): number {
  if (!hits.length) return Number.POSITIVE_INFINITY;
  return Math.min(...hits.map((h) => h.barsAgo));
}

export function RecentSignalsTab({
  entries,
  loadingIndex,
  tickerHref = (ticker) =>
    `/browse?ticker=${encodeURIComponent(ticker)}&tf=${RECENT_SIGNAL_TIMEFRAME}`,
  onTickerSelect,
}: {
  entries: IndexEntry[];
  loadingIndex: boolean;
  tickerHref?: (ticker: string) => string;
  onTickerSelect?: (ticker: string) => void;
}) {
  const dailyEntries = useMemo(
    () => entries.filter((e) => e.timeframe === RECENT_SIGNAL_TIMEFRAME),
    [entries],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, CachedSignals>>({});
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [displayBars, setDisplayBars] = useState<RecentSignalDisplayBars>(
    () => getRecentSignalDisplayBars(),
  );

  const displayLabel = recentSignalWindowLabel(displayBars);

  const onDisplayBarsChange = (n: number) => {
    setDisplayBars(setRecentSignalDisplayBars(n));
  };

  const entryKey = useMemo(
    () => dailyEntries.map((e) => `${e.ticker}:${e.timeframe}`).join("|"),
    [dailyEntries],
  );

  useEffect(() => {
    setSelected(null);
    setCache({});
    setScannedCount(0);

    if (!dailyEntries.length) {
      setScanning(false);
      return;
    }

    let cancelled = false;
    setScanning(true);

    void (async () => {
      const results = await mapPool(dailyEntries, SCAN_CONCURRENCY, async (entry) => {
        try {
          const quote = await loadQuote(entry.ticker, RECENT_SIGNAL_TIMEFRAME);
          if (cancelled) {
            return { ticker: entry.ticker, hits: [] as RecentStrategyHit[] };
          }
          const evaluation = evaluateQuote(
            quote.ohlcv,
            RECENT_SIGNAL_TIMEFRAME,
            getEffectiveIndicatorsConfig(),
            { trendlineAlgo: getTrendlineAlgoVersion() },
          );
          if (evaluation.fatalError) {
            return {
              ticker: entry.ticker,
              hits: [] as RecentStrategyHit[],
              error: evaluation.fatalError,
            };
          }
          return {
            ticker: entry.ticker,
            hits: recentHitsFromEvaluation(
              evaluation,
              RECENT_SIGNAL_SCAN_BARS,
            ),
          };
        } catch (e) {
          return {
            ticker: entry.ticker,
            hits: [] as RecentStrategyHit[],
            error: errorMessage(e),
          };
        } finally {
          if (!cancelled) {
            setScannedCount((n) => n + 1);
          }
        }
      });

      if (cancelled) return;

      const next: Record<string, CachedSignals> = {};
      for (const row of results) {
        next[row.ticker] = { hits: row.hits, error: row.error };
      }
      setCache(next);
      setScanning(false);
    })();

    return () => {
      cancelled = true;
    };
    // entryKey captures ticker identity; dailyEntries is read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryKey]);

  const signalEntries = useMemo(() => {
    return dailyEntries
      .map((e) => ({
        entry: e,
        hits: filterHitsByDisplayBars(
          cache[e.ticker]?.hits ?? [],
          displayBars,
        ),
      }))
      .filter((row) => row.hits.length > 0)
      .sort((a, b) => {
        const ago = freshestBarsAgo(a.hits) - freshestBarsAgo(b.hits);
        if (ago !== 0) return ago;
        return b.hits.length - a.hits.length;
      });
  }, [dailyEntries, cache, displayBars]);

  const scannedHitCount = useMemo(
    () =>
      dailyEntries.reduce((n, e) => n + (cache[e.ticker]?.hits.length ?? 0), 0),
    [dailyEntries, cache],
  );

  const toggleTicker = (ticker: string) => {
    setSelected((cur) => (cur === ticker ? null : ticker));
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <SectionTitle>최근 {displayLabel} 시그널</SectionTitle>
        <p className="text-sm text-text-secondary">
          저장된 일봉 OHLCV 기준으로 최근 {RECENT_SIGNAL_SCAN_BARS}일을 스캔해
          두고, 선택한 기간의 매수·매도 시그널만 표시합니다. 실시간 시세가
          아닙니다.
        </p>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          <span className="font-medium">표시 기간</span>
          <select
            aria-label="표시 기간"
            className="w-fit rounded border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            value={displayBars}
            onChange={(e) => onDisplayBarsChange(Number(e.target.value))}
          >
            {RECENT_SIGNAL_DISPLAY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {recentSignalWindowLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {loadingIndex ? (
        <Card>
          <p className="text-sm text-text-secondary">목록 로딩 중…</p>
        </Card>
      ) : !dailyEntries.length ? (
        <Card>
          <p className="text-sm text-text-secondary">
            일봉 데이터가 없습니다.{" "}
            <Link to="/" className="text-accent">
              홈
            </Link>
            에서 수집을 요청하세요.
          </p>
        </Card>
      ) : scanning ? (
        <Card>
          <p className="text-sm text-text-secondary">
            시그널 스캔 중… {scannedCount}/{dailyEntries.length}
          </p>
        </Card>
      ) : !signalEntries.length ? (
        <Card>
          <p className="text-sm text-text-secondary">
            {scannedHitCount > 0
              ? `최근 ${displayLabel}에 매수·매도 시그널이 있는 종목이 없습니다. 기간을 늘려 보세요.`
              : `최근 ${RECENT_SIGNAL_SCAN_BARS}일에 매수·매도 시그널이 있는 종목이 없습니다.`}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {signalEntries.map(({ entry, hits }) => {
            const open = selected === entry.ticker;
            const buy = hits.filter((h) => h.direction === "bullish").length;
            const sell = hits.filter((h) => h.direction === "bearish").length;
            return (
              <li key={entry.ticker}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTicker(entry.ticker)}
                      className="text-left text-base font-semibold text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      {open ? "▾ " : "▸ "}
                      {formatTickerLabel(entry.ticker)}
                      <span className="ml-2 text-xs font-normal text-text-tertiary">
                        {buy > 0 && `매수 ${buy}`}
                        {buy > 0 && sell > 0 && " · "}
                        {sell > 0 && `매도 ${sell}`}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-tertiary">일봉</span>
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
                          to={tickerHref(entry.ticker)}
                          className="text-accent no-underline hover:underline"
                        >
                          분석
                        </Link>
                      )}
                    </div>
                  </div>

                  {open && (
                    <ul className="space-y-2">
                      {hits.map((h) => (
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
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
