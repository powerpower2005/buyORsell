import type { Timeframe } from "@/lib/types";
import type { OscPaneSpec } from "@/lib/chart/oscillatorPaneSpecs";
import { fmtVolume } from "@/lib/chart/oscillatorPaneSpecs";
import {
  formatVolume,
  volumeMaColor,
  volumeMaLabel,
  type VolumeMaSeries,
} from "@/lib/evaluation/volumeMa";
import {
  FIB_LEVEL_COLORS,
  fibLevelLabel,
  fibRetracementPrice,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";

export type ChartLegendOverlayItem = {
  label: string;
  color: string;
};

export type ChartLegendProps = {
  overlayLegend: ChartLegendOverlayItem[];
  showVolume: boolean;
  latestVolume: number | undefined;
  volumeAverages: VolumeMaSeries[];
  timeframe: Timeframe;
  oscPanes: OscPaneSpec[];
  showFibLegend: boolean;
  showFibAnchors: boolean;
  fibRetracement: FibRetracement | null | undefined;
  visibleFibLevels: FibLevelRatio[];
};

/** Always-visible chart-reading legend (overlay / panes / fib). Max ~3 rows. */
export function ChartLegend({
  overlayLegend,
  showVolume,
  latestVolume,
  volumeAverages,
  timeframe,
  oscPanes,
  showFibLegend,
  showFibAnchors,
  fibRetracement,
  visibleFibLevels,
}: ChartLegendProps) {
  return (
    <>
      {overlayLegend.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          <span>지표 오버레이:</span>
          {overlayLegend.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block h-0.5 w-4 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="tabular-nums">{item.label}</span>
            </span>
          ))}
        </div>
      )}

      {(showVolume || oscPanes.length > 0) && (
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          <span>보조 패널:</span>
          {showVolume && (
            <>
              <span className="tabular-nums text-text-tertiary">
                거래량 {fmtVolume(latestVolume)}
              </span>
              {volumeAverages.map((avg) => (
                <span
                  key={avg.period}
                  className="flex items-center gap-1 tabular-nums text-text-tertiary"
                >
                  <span
                    className="inline-block h-0.5 w-3 rounded-sm"
                    style={{ backgroundColor: volumeMaColor(avg.period) }}
                  />
                  {volumeMaLabel(avg.period, timeframe)}{" "}
                  {avg.available && avg.latest != null
                    ? formatVolume(avg.latest)
                    : "—"}
                </span>
              ))}
            </>
          )}
          {oscPanes.map((pane) =>
            pane.legendItems?.length ? (
              <span
                key={pane.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-tertiary"
              >
                <span className="text-text-secondary">{pane.title}</span>
                {pane.legendItems.map((item) => (
                  <span
                    key={`${pane.id}-${item.label}`}
                    className="flex items-center gap-1 tabular-nums"
                  >
                    <span
                      className="inline-block h-0.5 w-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                    {item.value != null ? ` ${item.value}` : ""}
                  </span>
                ))}
              </span>
            ) : (
              <span
                key={pane.id}
                className="tabular-nums text-text-tertiary"
              >
                {pane.title} {pane.latest}
              </span>
            ),
          )}
        </div>
      )}

      {showFibLegend && fibRetracement && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
          <span>피보나치 되돌림:</span>
          {showFibAnchors && (
            <>
              <span className="tabular-nums text-text-tertiary">
                0% {fibRetracement.high.price.toFixed(2)} (
                {fibRetracement.high.date})
              </span>
              <span className="tabular-nums text-text-tertiary">
                100% {fibRetracement.low.price.toFixed(2)} (
                {fibRetracement.low.date})
              </span>
            </>
          )}
          {visibleFibLevels.map((ratio) => (
            <span key={ratio} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded-sm"
                style={{ backgroundColor: FIB_LEVEL_COLORS[ratio] }}
              />
              <span className="tabular-nums text-text-tertiary">
                {fibLevelLabel(ratio)}{" "}
                {fibRetracementPrice(
                  fibRetracement.low.price,
                  fibRetracement.high.price,
                  ratio,
                ).toFixed(2)}
              </span>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
