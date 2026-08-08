import { useEffect, type MutableRefObject, type RefObject } from "react";
import {
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { IndicatorResults, Timeframe } from "@/lib/types";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  bbOverlayKey,
  resolveBbBandColor,
  type BbBandId,
} from "@/lib/bbOverlay";
import {
  BOLLINGER,
  DIRECTION,
  SERIES,
  SIGNAL,
} from "@/lib/chart/chartTheme";
import {
  ICHIMOKU_LINE_ORDER,
  ICHIMOKU_PART_META,
  ichimokuOverlayKey,
  resolveIchimokuColor,
  type IchimokuPartId,
} from "@/lib/ichimokuOverlay";
import type { AuxIndicatorId } from "@/lib/auxIndicatorStore";

export type UseIndicatorOverlaysArgs = {
  chartRef: RefObject<IChartApi | null>;
  overlayRefs: MutableRefObject<Map<string, ISeriesApi<"Line">>>;
  indicators?: IndicatorResults;
  timeframe: Timeframe;
  maVisibility?: {
    sma?: Record<number, boolean>;
    ema?: Record<number, boolean>;
  };
  bbVisibility?: Partial<Record<BbBandId, boolean>>;
  ichimokuVisibility?: Partial<Record<IchimokuPartId, boolean>>;
  auxIndicatorVisibility?: Partial<Record<AuxIndicatorId, boolean>>;
  barsLength: number;
};

/** MA / BB / VWAP / Keltner / Ichimoku line series on main pane. */
export function useIndicatorOverlays({
  chartRef,
  overlayRefs,
  indicators,
  timeframe,
  maVisibility,
  bbVisibility,
  ichimokuVisibility,
  auxIndicatorVisibility,
  barsLength,
}: UseIndicatorOverlaysArgs) {
  // ─── MA / BB overlays (pane 0) ─────────────────────────────────────────────
  // Toggle via visible:true/false (do not removeSeries on every click — that can
  // blank the price pane after rapid BB checkbox toggles).

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !indicators) return;

    const wanted = new Set<string>();

    const upsertLine = (
      key: string,
      points: { date: string; value: number }[],
      opts: {
        color: string;
        lineWidth: 1 | 2;
        visible: boolean;
        lineStyle?: LineStyle;
      },
    ) => {
      wanted.add(key);
      let line = overlayRefs.current.get(key);
      if (!line) {
        line = chart.addSeries(LineSeries, {
          color: opts.color,
          lineWidth: opts.lineWidth,
          lineStyle: opts.lineStyle,
          visible: opts.visible,
          title: "",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          // Keep candles driving the scale when overlays are hidden/shown.
          autoscaleInfoProvider: () => null,
        });
        overlayRefs.current.set(key, line);
      } else {
        line.applyOptions({
          color: opts.color,
          lineWidth: opts.lineWidth,
          lineStyle: opts.lineStyle,
          visible: opts.visible,
          title: "",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          autoscaleInfoProvider: () => null,
        });
      }
      line.setData(
        points.map((p) => ({
          time: p.date as `${number}-${number}-${number}`,
          value: p.value,
        })),
      );
    };

    const drawGroup = (
      pluginId: "sma" | "ema",
      prefix: string,
      lineWidth: 1 | 2,
    ) => {
      const cfg = getIndicatorConfig(pluginId);
      if (!cfg?.enabled) return;
      const out = indicators.indicators[pluginId];
      if (!out) return;
      const periods = (cfg.params.periods as number[]) ?? [];
      const colors = parsePeriodColors(cfg.params.colors);
      const periodVis = maVisibility?.[pluginId];

      periods.forEach((period, i) => {
        const key = `${prefix}:${period}`;
        const points = out.series[key];
        if (!points?.length) return;
        upsertLine(key, points, {
          color: resolvePeriodColor(colors, period, i),
          lineWidth,
          visible: periodVis?.[period] ?? false,
        });
      });
    };

    drawGroup("sma", "sma", 2);
    drawGroup("ema", "ema", 1);

    const bbCfg = getIndicatorConfig("bb");
    const bbOut = indicators.indicators.bb;
    if (bbCfg?.enabled && bbOut) {
      const colors = parsePeriodColors(bbCfg.params.colors);
      for (const band of BB_BAND_ORDER) {
        const meta = BB_BAND_META[band];
        const key = bbOverlayKey(band);
        const points = bbOut.series[meta.seriesKey];
        if (!points?.length) continue;
        const bbWidth: 1 | 2 = band === "middle" ? 2 : 1;
        upsertLine(key, points, {
          color: resolveBbBandColor(colors, band),
          lineWidth: bbWidth,
          visible: bbVisibility?.[band] ?? false,
        });
      }
    }

    const ichiCfg = getIndicatorConfig("ichimoku");
    const ichiOut = indicators.indicators.ichimoku;
    if (ichiCfg?.enabled && ichiOut) {
      const colors = parsePeriodColors(ichiCfg.params.colors);
      for (const part of ICHIMOKU_LINE_ORDER) {
        const meta = ICHIMOKU_PART_META[part];
        const seriesKey = meta.seriesKey;
        if (!seriesKey) continue;
        const key = ichimokuOverlayKey(part);
        const points = ichiOut.series[seriesKey];
        if (!points?.length) continue;
        const lineWidth: 1 | 2 =
          part === "kijun" || part === "tenkan" ? 2 : 1;
        upsertLine(key, points, {
          color: resolveIchimokuColor(colors, part),
          lineWidth,
          visible: ichimokuVisibility?.[part] ?? false,
        });
      }
    }

    const keltnerCfg = getIndicatorConfig("keltner");
    const keltnerOut = indicators.indicators.keltner;
    const keltnerVis = auxIndicatorVisibility?.keltner === true;
    if (keltnerCfg?.enabled && keltnerOut) {
      const colors = parsePeriodColors(keltnerCfg.params.colors);
      if (keltnerOut.series.mid?.length) {
        upsertLine("keltner:mid", keltnerOut.series.mid, {
          color: colors.mid ?? SERIES.cyan,
          lineWidth: 2,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.upper?.length) {
        upsertLine("keltner:upper", keltnerOut.series.upper, {
          color: colors.upper ?? BOLLINGER.upper,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
      if (keltnerOut.series.lower?.length) {
        upsertLine("keltner:lower", keltnerOut.series.lower, {
          color: colors.lower ?? BOLLINGER.lower,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: keltnerVis,
        });
      }
    }

    const bbWideCfg = getIndicatorConfig("bbWide");
    const bbWideOut = indicators.indicators.bbWide;
    const bbWideVis = auxIndicatorVisibility?.bbWide === true;
    if (bbWideCfg?.enabled && bbWideOut) {
      const colors = parsePeriodColors(bbWideCfg.params.colors);
      if (bbWideOut.series.middle?.length) {
        upsertLine("bbWide:middle", bbWideOut.series.middle, {
          color: colors.middle ?? BOLLINGER.mid,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: bbWideVis,
        });
      }
      if (bbWideOut.series.upper?.length) {
        upsertLine("bbWide:upper", bbWideOut.series.upper, {
          color: colors.upper ?? SIGNAL.bearish,
          lineWidth: 1,
          visible: bbWideVis,
        });
      }
      if (bbWideOut.series.lower?.length) {
        upsertLine("bbWide:lower", bbWideOut.series.lower, {
          color: colors.lower ?? SIGNAL.bearish,
          lineWidth: 1,
          visible: bbWideVis,
        });
      }
    }

    const vwapCfg = getIndicatorConfig("vwap");
    const vwapOut = indicators.indicators.vwap;
    const vwapVis = auxIndicatorVisibility?.vwap === true;
    if (vwapCfg?.enabled && vwapOut) {
      const colors = parsePeriodColors(vwapCfg.params.colors);
      const vwapColor = colors.vwap ?? SERIES.accent;
      const band1 = colors.band1 ?? SERIES.orangeDeep;
      const band2 = colors.band2 ?? SERIES.orange;
      const slope = vwapOut.latest.slope;
      const centerColor =
        slope == null || slope === 0
          ? vwapColor
          : slope > 0
            ? DIRECTION.up
            : DIRECTION.down;
      if (vwapOut.series.vwap?.length) {
        upsertLine("vwap", vwapOut.series.vwap, {
          color: centerColor,
          lineWidth: 2,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.upper1?.length) {
        upsertLine("vwap:upper1", vwapOut.series.upper1, {
          color: band1,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.lower1?.length) {
        upsertLine("vwap:lower1", vwapOut.series.lower1, {
          color: band1,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.upper2?.length) {
        upsertLine("vwap:upper2", vwapOut.series.upper2, {
          color: band2,
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          visible: vwapVis,
        });
      }
      if (vwapOut.series.lower2?.length) {
        upsertLine("vwap:lower2", vwapOut.series.lower2, {
          color: band2,
          lineWidth: 1,
          lineStyle: LineStyle.SparseDotted,
          visible: vwapVis,
        });
      }
    }

    const foreverCfg = getIndicatorConfig("forever_vwap");
    const foreverOut = indicators.indicators.forever_vwap;
    const foreverVis = auxIndicatorVisibility?.forever_vwap === true;
    if (foreverCfg?.enabled && foreverOut) {
      const colors = parsePeriodColors(foreverCfg.params.colors);
      const up = colors.up ?? SERIES.orangeDeep;
      const down = colors.down ?? SERIES.purple;
      const anchoredColor = colors.anchored ?? SERIES.slate;
      const trend = foreverOut.latest.trend;
      const centerColor =
        trend == null || trend === 0 ? up : trend > 0 ? up : down;
      if (foreverOut.series.vwap?.length) {
        upsertLine("forever_vwap", foreverOut.series.vwap, {
          color: centerColor,
          lineWidth: 2,
          visible: foreverVis,
        });
      }
      if (foreverOut.series.anchored?.length) {
        upsertLine("forever_vwap:anchored", foreverOut.series.anchored, {
          color: anchoredColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          visible: foreverVis,
        });
      }
    }

    const psarCfg = getIndicatorConfig("psar");
    const psarOut = indicators.indicators.psar;
    const psarPoints = psarOut?.series.psar;
    if (psarCfg?.enabled && psarPoints?.length) {
      const bull = (psarOut?.latest.direction ?? 0) > 0;
      upsertLine("psar", psarPoints, {
        color: bull ? DIRECTION.up : DIRECTION.down,
        lineWidth: 1,
        lineStyle: LineStyle.SparseDotted,
        visible: auxIndicatorVisibility?.psar === true,
      });
    }

    const stCfg = getIndicatorConfig("supertrend");
    const stOut = indicators.indicators.supertrend;
    const stPoints = stOut?.series.supertrend;
    if (stCfg?.enabled && stPoints?.length) {
      const bull = (stOut?.latest.direction ?? 0) > 0;
      upsertLine("supertrend", stPoints, {
        color: bull ? DIRECTION.up : DIRECTION.down,
        lineWidth: 2,
        visible: auxIndicatorVisibility?.supertrend === true,
      });
    }

    for (const [key, line] of [...overlayRefs.current.entries()]) {
      if (wanted.has(key)) continue;
      try {
        chart.removeSeries(line);
      } catch {
        // Series may already be gone after chart recreate.
      }
      overlayRefs.current.delete(key);
    }
    // Re-read periods/colors from config each run (localStorage may change via modal).
  }, [
    indicators,
    timeframe,
    maVisibility,
    bbVisibility,
    ichimokuVisibility,
    auxIndicatorVisibility,
    barsLength,
  ]);
}
