import { loadWatchlist, toggleWatchlist } from "@/lib/watchlist";
import clsx from "clsx";

interface Props {
  tickers: string[];
  active: string;
  onSelect: (ticker: string) => void;
  onUpdate: () => void;
}

export function WatchlistSidebar({ tickers, active, onSelect, onUpdate }: Props) {
  if (!tickers.length) return null;

  return (
    <div className="mb-6 text-left">
      <p className="mb-2 text-xs font-medium text-text-tertiary">Watchlist</p>
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
        <button
          type="button"
          className="text-xs text-text-tertiary underline"
          onClick={() => {
            if (active) toggleWatchlist(active);
            onUpdate();
          }}
        >
          현재 종목 제거
        </button>
      </div>
    </div>
  );
}

export function useWatchlistState() {
  return loadWatchlist();
}
