import timeframes from "../../config/timeframes.json";
import type { Timeframe } from "@/lib/types";
import clsx from "clsx";

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  /**
   * When set, only these timeframes are selectable (still must be config-enabled).
   * Missing TFs render disabled with “(없음)”.
   */
  available?: readonly Timeframe[];
}

export function TimeframeTabs({ value, onChange, available }: Props) {
  const entries = Object.entries(timeframes.timeframes) as [
    Timeframe,
    { label: string; enabled: boolean },
  ][];

  return (
    <div className="flex flex-wrap gap-2 text-left">
      {entries.map(([tf, cfg]) => {
        const hasData = available === undefined || available.includes(tf);
        const selectable = cfg.enabled && hasData;
        return (
          <button
            key={tf}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onChange(tf)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm",
              value === tf && selectable
                ? "bg-accent text-white"
                : selectable
                  ? "bg-surface-elevated text-text-secondary hover:text-text-primary"
                  : "cursor-not-allowed bg-surface text-text-tertiary",
            )}
          >
            {cfg.label}
            {!cfg.enabled && " (준비 중)"}
            {cfg.enabled && available !== undefined && !hasData && " (없음)"}
          </button>
        );
      })}
    </div>
  );
}
