import {
  LineSeries,
  LineStyle,
  type AutoscaleInfoProvider,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { SCALE_MARGINS } from "@/lib/chart/chartTheme";

/**
 * Y-axis = visible series min/max ∪ guide levels, then a little padding.
 * Guide lines stay on-screen without relying on createPriceLine autoscale.
 */
export function paddedDataAutoscale(
  padRatio = 0.12,
  includeLevels: readonly number[] = [],
): AutoscaleInfoProvider {
  return (base) => {
    const res = base();
    const levels = includeLevels.filter((v) => Number.isFinite(v));
    let minValue: number | null = null;
    let maxValue: number | null = null;

    if (
      res?.priceRange &&
      Number.isFinite(res.priceRange.minValue) &&
      Number.isFinite(res.priceRange.maxValue)
    ) {
      minValue = res.priceRange.minValue;
      maxValue = res.priceRange.maxValue;
    }

    for (const lv of levels) {
      minValue = minValue == null ? lv : Math.min(minValue, lv);
      maxValue = maxValue == null ? lv : Math.max(maxValue, lv);
    }

    if (minValue == null || maxValue == null) return res;

    if (minValue === maxValue) {
      const d = Math.abs(minValue) * 0.05 || 1;
      return {
        priceRange: { minValue: minValue - d, maxValue: maxValue + d },
      };
    }

    const pad = (maxValue - minValue) * padRatio;
    return {
      priceRange: { minValue: minValue - pad, maxValue: maxValue + pad },
    };
  };
}

export type PaneLineOptions = {
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: LineStyle;
  /** OB/OS / zero / etc. — always kept inside the pane Y range. */
  includeLevels?: readonly number[];
};

/**
 * Data series for an indicator pane.
 * Pass `includeLevels` so guide prices expand the axis just enough to stay visible.
 */
export function addPaneDataLine(
  chart: IChartApi,
  paneIndex: number,
  opts: PaneLineOptions,
): ISeriesApi<"Line"> {
  const series = chart.addSeries(
    LineSeries,
    {
      color: opts.color,
      lineWidth: opts.lineWidth ?? 2,
      lineStyle: opts.lineStyle,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      autoscaleInfoProvider: paddedDataAutoscale(0.12, opts.includeLevels ?? []),
    },
    paneIndex,
  );
  series.priceScale().applyOptions({
    scaleMargins: { ...SCALE_MARGINS.oscillator },
    autoScale: true,
  });
  return series;
}

/**
 * Horizontal guide drawn separately; does not autoscale on its own
 * (the data series’ `includeLevels` owns the axis expansion).
 */
export function addPaneRefLevel(
  chart: IChartApi,
  paneIndex: number,
  price: number,
  color: string,
  from: Time,
  to: Time,
  axisLabelVisible = false,
): ISeriesApi<"Line"> {
  const series = chart.addSeries(
    LineSeries,
    {
      color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      lastValueVisible: axisLabelVisible,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      autoscaleInfoProvider: () => null,
    },
    paneIndex,
  );
  series.setData([
    { time: from, value: price },
    { time: to, value: price },
  ]);
  return series;
}

export function timeExtent(
  data: readonly { time: Time }[],
): { from: Time; to: Time } | null {
  if (data.length < 1) return null;
  return { from: data[0]!.time, to: data[data.length - 1]!.time };
}
