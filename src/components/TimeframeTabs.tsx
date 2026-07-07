import timeframes from "../../config/timeframes.json";
import type { Timeframe } from "@/lib/types";
import clsx from "clsx";

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframeTabs({ value, onChange }: Props) {
  const entries = Object.entries(timeframes.timeframes) as [
    Timeframe,
    { label: string; enabled: boolean },
  ][];

  return (
    <div className="flex flex-wrap gap-2 text-left">
      {entries.map(([tf, cfg]) => (
        <button
          key={tf}
          type="button"
          disabled={!cfg.enabled}
          onClick={() => cfg.enabled && onChange(tf)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm",
            value === tf && cfg.enabled
              ? "bg-accent text-white"
              : cfg.enabled
                ? "bg-surface-elevated text-text-secondary hover:text-text-primary"
                : "cursor-not-allowed bg-surface text-text-tertiary",
          )}
        >
          {cfg.label}
          {!cfg.enabled && " (준비 중)"}
        </button>
      ))}
    </div>
  );
}
