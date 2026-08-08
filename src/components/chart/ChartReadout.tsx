import type { RefObject } from "react";
import { DIRECTION } from "@/lib/chart/chartTheme";
import { formatVolume } from "@/lib/evaluation/volumeMa";

export type OhlcvReadout = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Previous-close based daily change (%). Null for the first bar. */
  changePct: number | null;
};

export function fmtPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

export function fmtChangePct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export type ChartReadoutProps = {
  ohlcvReadout: OhlcvReadout | null;
  markerHover: {
    x: number;
    y: number;
    tip: { title: string; lines: string[] };
  } | null;
  /** Chart wrap — clamps marker tooltip horizontal position. */
  containerRef: RefObject<HTMLElement | null>;
};

/** Presentational OHLCV overlay + marker hover tooltip. */
export function ChartReadout({
  ohlcvReadout,
  markerHover,
  containerRef,
}: ChartReadoutProps) {
  return (
    <>
      {markerHover && (
        <div
          className="pointer-events-none absolute z-[3] max-w-[240px] rounded-md border border-border/80 bg-bg/95 px-2.5 py-1.5 text-left shadow-lg backdrop-blur-[2px]"
          style={{
            left: Math.min(
              markerHover.x + 14,
              (containerRef.current?.clientWidth ?? 320) - 250,
            ),
            top: Math.max(8, markerHover.y - 8),
          }}
        >
          <p className="text-[11px] font-semibold text-text-primary">
            {markerHover.tip.title}
          </p>
          {markerHover.tip.lines.map((line) => (
            <p
              key={line}
              className="mt-0.5 text-[10px] leading-snug text-text-secondary"
            >
              {line}
            </p>
          ))}
        </div>
      )}
      {ohlcvReadout && (
        <div
          className="pointer-events-none absolute left-2 top-2 z-[2] rounded bg-black/55 px-2.5 py-1.5 text-[11px] leading-relaxed text-text-secondary backdrop-blur-[2px]"
          aria-live="polite"
        >
          <div className="mb-0.5 tabular-nums text-text-tertiary">
            {ohlcvReadout.date}
          </div>
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 tabular-nums">
            <span>
              O{" "}
              <span className="text-text-primary">
                {fmtPrice(ohlcvReadout.open)}
              </span>
            </span>
            <span>
              H{" "}
              <span className="text-text-primary">
                {fmtPrice(ohlcvReadout.high)}
              </span>
            </span>
            <span>
              L{" "}
              <span className="text-text-primary">
                {fmtPrice(ohlcvReadout.low)}
              </span>
            </span>
            <span>
              C{" "}
              <span
                style={{
                  color:
                    ohlcvReadout.close >= ohlcvReadout.open
                      ? DIRECTION.up
                      : DIRECTION.down,
                }}
              >
                {fmtPrice(ohlcvReadout.close)}
              </span>
            </span>
            <span>
              <span
                style={{
                  color:
                    ohlcvReadout.changePct == null
                      ? undefined
                      : ohlcvReadout.changePct > 0
                        ? DIRECTION.up
                        : ohlcvReadout.changePct < 0
                          ? DIRECTION.down
                          : undefined,
                }}
                className={
                  ohlcvReadout.changePct == null ||
                  ohlcvReadout.changePct === 0
                    ? "text-text-primary"
                    : undefined
                }
              >
                {fmtChangePct(ohlcvReadout.changePct)}
              </span>
            </span>
            <span>
              V{" "}
              <span className="text-text-primary">
                {formatVolume(ohlcvReadout.volume)}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
