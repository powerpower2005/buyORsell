import type { ComponentProps, RefObject } from "react";
import type { Timeframe } from "@/lib/types";
import type { OscPaneSpec } from "@/lib/chart/oscillatorPaneSpecs";
import type { VolumeMaSeries } from "@/lib/evaluation/volumeMa";
import type {
  FibLevelRatio,
  FibRetracement,
} from "@/lib/fibonacciStore";
import type { MarkerTooltip } from "@/lib/chart/markerTooltips";
import { Card } from "../ui/Card";
import { ChartLegend } from "./ChartLegend";
import { ChartReadout, type OhlcvReadout } from "./ChartReadout";
import { SignalSummary } from "./SignalSummary";

export type CandleChartViewProps = {
  pickHint: string | null;
  fibDrawMode?: boolean;
  totalHeight: number;
  wrapRef: RefObject<HTMLDivElement>;
  containerRef: RefObject<HTMLDivElement>;
  overlayRef: RefObject<HTMLCanvasElement>;
  ohlcvReadout: OhlcvReadout | null;
  markerHover: {
    x: number;
    y: number;
    tip: MarkerTooltip;
  } | null;
  secondaryPaneLabelMeta: { key: string; title: string; detail?: string }[];
  paneLabelTops: Record<string, number>;
  overlayLegend: { label: string; color: string }[];
  showVolume: boolean;
  latestVolume: number | undefined;
  volumeAverages: VolumeMaSeries[];
  timeframe: Timeframe;
  oscPanes: OscPaneSpec[];
  showFibLegend: boolean;
  showFibAnchors: boolean;
  fibRetracement?: FibRetracement | null;
  visibleFibLevels: FibLevelRatio[];
  signalSummaryProps: ComponentProps<typeof SignalSummary>;
};

export function CandleChartView({
  pickHint,
  fibDrawMode,
  totalHeight,
  wrapRef,
  containerRef,
  overlayRef,
  ohlcvReadout,
  markerHover,
  secondaryPaneLabelMeta,
  paneLabelTops,
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
  signalSummaryProps,
}: CandleChartViewProps) {
  return (
    <Card className="overflow-hidden p-2 sm:p-3">
      <div className="w-full text-left">
        {/* Pick hint banner */}
        {pickHint && (
          <div className="mb-2 rounded bg-amber-900/60 px-3 py-1.5 text-xs font-medium text-amber-200">
            {pickHint}
          </div>
        )}

        <div
          ref={wrapRef}
          className="relative w-full"
          style={{
            height: totalHeight,
            cursor: fibDrawMode ? "crosshair" : undefined,
          }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 w-full"
            aria-label="candlestick-chart"
          />
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 z-[1]"
            aria-hidden
          />
          <ChartReadout
            ohlcvReadout={ohlcvReadout}
            markerHover={markerHover}
            containerRef={wrapRef}
          />
          {secondaryPaneLabelMeta.map((label) => {
            const top = paneLabelTops[label.key];
            if (top == null) return null;
            return (
              <div
                key={label.key}
                className="pointer-events-none absolute left-2 z-[2] max-w-[min(100%,220px)] truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-text-primary backdrop-blur-[2px]"
                style={{ top }}
                title={
                  label.detail
                    ? `${label.title} ${label.detail}`
                    : label.title
                }
              >
                <span>{label.title}</span>
                {label.detail != null && label.detail !== "" && (
                  <span className="ml-1.5 tabular-nums font-normal text-text-tertiary">
                    {label.detail}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <ChartLegend
            overlayLegend={overlayLegend}
            showVolume={showVolume}
            latestVolume={latestVolume}
            volumeAverages={volumeAverages}
            timeframe={timeframe}
            oscPanes={oscPanes}
            showFibLegend={showFibLegend}
            showFibAnchors={showFibAnchors}
            fibRetracement={fibRetracement}
            visibleFibLevels={visibleFibLevels}
          />
          <SignalSummary {...signalSummaryProps} />
        </div>
      </div>
    </Card>
  );
}
