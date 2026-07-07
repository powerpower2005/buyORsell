import clsx from "clsx";

interface Props {
  tickers: string[];
  active: string;
  timeframe: string;
  loading?: boolean;
  onSelect: (ticker: string) => void;
}

export function WatchlistSidebar({
  tickers,
  active,
  timeframe,
  loading,
  onSelect,
}: Props) {
  return (
    <div className="mb-6 text-left">
      <p className="mb-2 text-xs font-medium text-text-tertiary">
        수집된 종목
        <span className="ml-1 text-text-secondary">({timeframe})</span>
      </p>
      {loading ? (
        <p className="text-xs text-text-secondary">목록 불러오는 중…</p>
      ) : tickers.length === 0 ? (
        <p className="text-xs text-text-secondary">
          아직 수집된 데이터가 없습니다. GitHub Issue로 fetch를 요청하세요.
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
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
