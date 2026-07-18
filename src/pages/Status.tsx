import { useEffect, useState } from "react";
import { loadIndex, loadQuote } from "@/lib/dataLoader";
import type { IndexFile } from "@/lib/types";
import { Card, SectionTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ErrorBanner } from "../components/ErrorBanner";
import { validateFreshness } from "@/lib/validation";
import { errorMessage } from "@/lib/errors";
import { formatTickerLabel } from "@/lib/tickerNames";
import type { Timeframe } from "@/lib/types";

export function StatusPage() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!index?.entries.length) return;
    (async () => {
      const map: Record<string, string> = {};
      const errors: Record<string, string> = {};
      for (const e of index.entries) {
        const key = `${e.ticker}:${e.timeframe}`;
        try {
          const q = await loadQuote(e.ticker, e.timeframe as Timeframe);
          map[key] = validateFreshness(q, e.timeframe as Timeframe).status;
        } catch (err) {
          errors[key] = errorMessage(err);
        }
      }
      setStatuses(map);
      setRowErrors(errors);
    })();
  }, [index]);

  return (
    <div className="space-y-6 text-left">
      <h1 className="text-2xl font-bold">데이터 현황</h1>
      {loadError && (
        <ErrorBanner title="index.json 로드 실패" message={loadError} />
      )}
      <Card>
        <SectionTitle>index.json</SectionTitle>
        {!index?.entries.length ? (
          <p className="text-sm text-text-secondary">
            {loadError ? "인덱스를 불러올 수 없습니다." : "등록된 데이터 없음"}
          </p>
        ) : (
          <ul className="space-y-3">
            {index.entries.map((e) => {
              const key = `${e.ticker}:${e.timeframe}`;
              const rowErr = rowErrors[key];
              const st = statuses[key];
              return (
                <li key={`${e.ticker}-${e.timeframe}`} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {formatTickerLabel(e.ticker)}
                    </span>
                    <span className="text-text-tertiary">{e.timeframe}</span>
                    {rowErr ? (
                      <Badge variant="negative">error</Badge>
                    ) : (
                      <Badge
                        variant={
                          st === "fresh"
                            ? "fresh"
                            : st === "stale"
                              ? "stale"
                              : "muted"
                        }
                      >
                        {st}
                      </Badge>
                    )}
                  </div>
                  {rowErr ? (
                    <p className="text-negative">{rowErr}</p>
                  ) : (
                    <p className="tabular-nums text-text-secondary">
                      {e.barCount} bars · {e.lastBarDate} · fetched {e.fetchedAt}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
