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
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const entryKey = useMemo(
    () => entries.map((e) => `${e.ticker}:${e.timeframe}`).join("|"),
    [entries],
  );

  useEffect(() => {
    setSelected(null);
    setCache({});
    setScannedCount(0);

    if (!entries.length) {
      setScanning(false);
      return;
    }

    let cancelled = false;
    setScanning(true);

    void (async () => {
      const results = await mapPool(entries, SCAN_CONCURRENCY, async (entry) => {
        try {
          const quote = await loadQuote(
            entry.ticker,
            entry.timeframe as Timeframe,
          );
          if (cancelled) {
            return { ticker: entry.ticker, hits: [] as RecentStrategyHit[] };
          }
          const evaluation = evaluateQuote(
            quote.ohlcv,
            entry.timeframe as Timeframe,
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
              RECENT_SIGNAL_WINDOW_BARS,
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
    // entryKey captures ticker:tf identity; entries is read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryKey]);

  const signalEntries = useMemo(() => {
    return entries
      .filter((e) => (cache[e.ticker]?.hits.length ?? 0) > 0)
      .sort((a, b) => {
        const hitsA = cache[a.ticker]!.hits;
        const hitsB = cache[b.ticker]!.hits;
        const ago = freshestBarsAgo(hitsA) - freshestBarsAgo(hitsB);
        if (ago !== 0) return ago;
        return hitsB.length - hitsA.length;
      });
  }, [entries, cache]);

  const toggleTicker = (ticker: string) => {
    setSelected((cur) => (cur === ticker ? null : ticker));
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <SectionTitle>최근 {RECENT_SIGNAL_WINDOW_BARS}봉 시그널</SectionTitle>
        <p className="text-sm text-text-secondary">
          저장된 OHLCV 기준으로 최근 {RECENT_SIGNAL_WINDOW_BARS}봉에 매수·매도
          시그널이 있는 종목만 표시합니다. 실시간 시세가 아닙니다.
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
      ) : scanning ? (
        <Card>
          <p className="text-sm text-text-secondary">
            시그널 스캔 중… {scannedCount}/{entries.length}
          </p>
        </Card>
      ) : !signalEntries.length ? (
        <Card>
          <p className="text-sm text-text-secondary">
            최근 {RECENT_SIGNAL_WINDOW_BARS}봉에 매수·매도 시그널이 있는 종목이
            없습니다.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {signalEntries.map((entry) => {
            const open = selected === entry.ticker;
            const row = cache[entry.ticker]!;
            const buy = row.hits.filter((h) => h.direction === "bullish").length;
            const sell = row.hits.filter((h) => h.direction === "bearish").length;
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
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
