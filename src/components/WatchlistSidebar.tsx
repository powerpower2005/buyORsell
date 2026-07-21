import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { formatTickerLabel } from "@/lib/tickerNames";
import {
  isWatchlistCollapsed,
  setWatchlistCollapsed,
} from "@/lib/sidebarOpenStore";

interface Props {
  tickers: string[];
  active: string;
  timeframe: string;
  loading?: boolean;
  onSelect: (ticker: string) => void;
  /** Override empty-state copy (e.g. Browse timeframe filter). */
  emptyMessage?: ReactNode;
}

export function WatchlistSidebar({
  tickers,
  active,
  timeframe,
  loading,
  onSelect,
  emptyMessage,
}: Props) {
  const [collapsed, setCollapsed] = useState(() => isWatchlistCollapsed());

  const setCollapsedPersisted = (next: boolean) => {
    setWatchlistCollapsed(next);
    setCollapsed(next);
  };

  return (
    <div className="rounded-xl border border-border bg-surface text-left">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-medium text-text-tertiary">
          수집된 종목
          <span className="ml-1 text-text-secondary">({timeframe})</span>
          {!collapsed && tickers.length > 0 && (
            <span className="ml-1 text-text-tertiary">· {tickers.length}</span>
          )}
        </p>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-tertiary hover:border-accent/40 hover:text-text-primary"
          onClick={() => setCollapsedPersisted(!collapsed)}
          title={collapsed ? "수집된 종목 펼치기" : "수집된 종목 접기"}
        >
          {collapsed ? "펼치기" : "접기"}
        </button>
      </div>

      {!collapsed && (
        <div className="border-t border-border px-3 py-2.5">
          {loading ? (
            <p className="text-xs text-text-secondary">목록 불러오는 중…</p>
          ) : tickers.length === 0 ? (
            <p className="text-xs text-text-secondary">
              {emptyMessage ??
                "아직 수집된 데이터가 없습니다. GitHub Issue로 fetch를 요청하세요."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tickers.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelect(t)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs",
                    active === t
                      ? "bg-accent text-white"
                      : "bg-surface-elevated text-text-secondary hover:text-text-primary",
                  )}
                >
                  {formatTickerLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
