import { useEffect, type MutableRefObject, type RefObject } from "react";
import {
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
} from "lightweight-charts";
import type { IndicatorResults, OHLCVBar, Timeframe } from "@/lib/types";
import { getIndicatorConfig } from "@/lib/configStore";
import {
  toLineData,
  toVolumeData,
  type OscPaneSpec,
} from "@/lib/chart/oscillatorPaneSpecs";
import {
  DIRECTION,
  OSC_LEVEL,
  SCALE_MARGINS,
  SERIES,
} from "@/lib/chart/chartTheme";
import {
  volumeMaColor,
  type VolumeMaSnapshot,
} from "@/lib/evaluation/volumeMa";
import { syncPaneLayout } from "./usePaneLayout";

export type OscSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

export type UseSecondaryPanesArgs = {
  chartRef: RefObject<IChartApi | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
  volumeRef: MutableRefObject<ISeriesApi<"Histogram"> | null>;
  volumeMaRefs: MutableRefObject<Map<number, ISeriesApi<"Line">>>;
  oscSeriesRefs: MutableRefObject<Map<string, OscSeries>>;
  bars: OHLCVBar[];
  indicators?: IndicatorResults;
  showVolume: boolean;
  oscPanes: OscPaneSpec[];
  volumeSnapshot: VolumeMaSnapshot | null;
  timeframe: Timeframe;
  mainHeight: number;
  totalHeight: number;
  captureTimeRange: () => LogicalRange | null;
  restoreTimeRange: (range: LogicalRange | null) => void;
  drawChartOverlays: () => void;
};

/** Volume + oscillator pane series creation/updates (native multi-pane). */
export function useSecondaryPanes({
  chartRef,
  containerRef,
  wrapRef,
  volumeRef,
  volumeMaRefs,
  oscSeriesRefs,
  bars,
  indicators,
  showVolume,
  oscPanes,
  volumeSnapshot,
  timeframe,
  mainHeight,
  totalHeight,
  captureTimeRange,
  restoreTimeRange,
  drawChartOverlays,
}: UseSecondaryPanesArgs) {
  // ─── Secondary panes: volume + oscillators (native multi-pane) ─────────────

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const savedRange = captureTimeRange();

    const safeRemove = (series: OscSeries | ISeriesApi<"Histogram">) => {
      try {
        chart.removeSeries(series);
      } catch {
        // Series may already be gone after pane teardown.
      }
    };
    for (const series of oscSeriesRefs.current.values()) {
      safeRemove(series);
    }
    oscSeriesRefs.current = new Map();
    if (volumeRef.current) {
      safeRemove(volumeRef.current);
      volumeRef.current = null;
    }
    for (const line of volumeMaRefs.current.values()) {
      safeRemove(line);
    }
    volumeMaRefs.current = new Map();

    const hasSecondary = showVolume || oscPanes.length > 0;
    if (!hasSecondary) {
      syncPaneLayout({
        chart,
        container: containerRef.current,
        wrap: wrapRef.current,
        totalHeight,
        mainHeight,
        showVolume,
        oscPanes,
      });
      restoreTimeRange(savedRange);
      drawChartOverlays();
      return;
    }

    let nextPane = 1;
    if (showVolume && bars.length && volumeSnapshot) {
      const volumePane = nextPane;
      const volume = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: "volume" },
          lastValueVisible: false,
          priceLineVisible: false,
        },
        volumePane,
      );
      volume.setData(toVolumeData(bars));
      volume.priceScale().applyOptions({
        scaleMargins: { ...SCALE_MARGINS.volume },
      });
      volumeRef.current = volume;

      for (const avg of volumeSnapshot.averages) {
        if (!avg.available || !avg.series.length) continue;
        const volMaWidth: 1 | 2 = avg.period <= 7 ? 2 : 1;
        const line = chart.addSeries(
          LineSeries,
          {
            color: volumeMaColor(avg.period),
            lineWidth: volMaWidth,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          volumePane,
        );
        line.setData(
          avg.series.map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
          })),
        );
        volumeMaRefs.current.set(avg.period, line);
      }
      nextPane += 1;
    }

    const volOffset = nextPane - 1;
    oscPanes.forEach((pane, index) => {
      const paneIndex = index + 1 + volOffset;
      const out = indicators?.indicators;
      if (!out) return;

      if (pane.id === "rsi") {
        const addRsiLine = (
          key: string,
          color: string,
          width: 1 | 2,
          data: ReturnType<typeof toLineData>,
        ) => {
          const series = chart.addSeries(
            LineSeries,
            {
              color,
              lineWidth: width,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          series.priceScale().applyOptions({
          scaleMargins: { ...SCALE_MARGINS.oscillator },
        });
          series.setData(data);
          oscSeriesRefs.current.set(key, series);
          return series;
        };

        const line = addRsiLine(
          "rsi",
          SERIES.purple,
          2,
          toLineData(out.rsi?.series.rsi),
        );
        const overbought =
          getIndicatorConfig("rsi")?.overbought ?? 70;
        const oversold = getIndicatorConfig("rsi")?.oversold ?? 30;
        line.createPriceLine({
          price: overbought,
          color: OSC_LEVEL.overbought,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: OSC_LEVEL.oversold,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        // Super RSI overlays: weighted + dynamic mid/upper/lower bands.
        if (out.rsi?.series.rsiUpper?.length) {
          addRsiLine(
            "rsiUpper",
            SERIES.pink,
            1,
            toLineData(out.rsi.series.rsiUpper),
          );
        }
        if (out.rsi?.series.rsiLower?.length) {
          addRsiLine(
            "rsiLower",
            SERIES.teal,
            1,
            toLineData(out.rsi.series.rsiLower),
          );
        }
        if (out.rsi?.series.rsiMid?.length) {
          addRsiLine(
            "rsiMid",
            SERIES.yellow,
            1,
            toLineData(out.rsi.series.rsiMid),
          );
        }
        if (out.rsi?.series.rsiWeighted?.length) {
          addRsiLine(
            "rsiWeighted",
            SERIES.slateDark,
            2,
            toLineData(out.rsi.series.rsiWeighted),
          );
        }
        return;
      }

      if (pane.id === "macd") {
        const hist = chart.addSeries(
          HistogramSeries,
          {
            lastValueVisible: false,
            priceLineVisible: false,
          },
          paneIndex,
        );
        hist.setData(
          (out.macd?.series.macdHist ?? []).map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
            color:
              p.value >= 0
                ? "rgba(0, 196, 113, 0.55)"
                : "rgba(240, 68, 82, 0.55)",
          })),
        );
        oscSeriesRefs.current.set("macdHist", hist);

        const macdLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.blue,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        macdLine.setData(toLineData(out.macd?.series.macd));
        oscSeriesRefs.current.set("macd", macdLine);
        macdLine.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        const signal = chart.addSeries(
          LineSeries,
          {
            color: SERIES.amber,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        signal.setData(toLineData(out.macd?.series.macdSignal));
        oscSeriesRefs.current.set("macdSignal", signal);
        return;
      }

      if (pane.id === "stoch") {
        const kLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.teal,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        kLine.setData(toLineData(out.stoch?.series.stochK));
        oscSeriesRefs.current.set("stochK", kLine);

        const overbought =
          getIndicatorConfig("stoch")?.overbought ?? 80;
        const oversold = getIndicatorConfig("stoch")?.oversold ?? 20;
        kLine.createPriceLine({
          price: overbought,
          color: OSC_LEVEL.overboughtStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        kLine.createPriceLine({
          price: 50,
          color: "rgba(148, 163, 184, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        kLine.createPriceLine({
          price: oversold,
          color: OSC_LEVEL.oversoldStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });

        const dLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.orange,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        dLine.setData(toLineData(out.stoch?.series.stochD));
        oscSeriesRefs.current.set("stochD", dLine);
        return;
      }

      if (pane.id === "mfi") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.cyan,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 80,
          color: OSC_LEVEL.overboughtStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 20,
          color: OSC_LEVEL.oversoldStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.mfi?.series.mfi));
        oscSeriesRefs.current.set("mfi", line);
        return;
      }

      if (pane.id === "atr") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.slate,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.atr?.series.atr));
        oscSeriesRefs.current.set("atr", line);
        return;
      }

      if (pane.id === "obv") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.sky,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.obv?.series.obv));
        oscSeriesRefs.current.set("obv", line);
        if (out.obv?.series.obvSignal?.length) {
          const sig = chart.addSeries(
            LineSeries,
            {
              color: "rgba(148, 163, 184, 0.85)",
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          sig.setData(toLineData(out.obv.series.obvSignal));
          oscSeriesRefs.current.set("obvSignal", sig);
        }
        return;
      }

      if (pane.id === "ad") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.ad?.series.ad));
        oscSeriesRefs.current.set("ad", line);
        return;
      }

      if (pane.id === "chaikin") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.pink,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.chaikin?.series.chaikin));
        oscSeriesRefs.current.set("chaikin", line);
        return;
      }

      if (pane.id === "eom") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.teal,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.eom?.series.eom));
        oscSeriesRefs.current.set("eom", line);
        if (out.eom?.series.eomSmooth?.length) {
          const smooth = chart.addSeries(
            LineSeries,
            {
              color: SERIES.amber,
              lineWidth: 2,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
          smooth.setData(toLineData(out.eom.series.eomSmooth));
          oscSeriesRefs.current.set("eomSmooth", smooth);
        }
        return;
      }

      if (pane.id === "obvMid") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.cyan,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.setData(toLineData(out.obvMid?.series.obvMid));
        oscSeriesRefs.current.set("obvMid", line);
        return;
      }

      if (pane.id === "equivolume") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.orange,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 1,
          color: "rgba(148, 163, 184, 0.45)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.setData(toLineData(out.equivolume?.series.boxRatio));
        oscSeriesRefs.current.set("equivolume", line);
        return;
      }

      if (pane.id === "adx") {
        const adxLine = chart.addSeries(
          LineSeries,
          {
            color: SERIES.yellow,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        adxLine.createPriceLine({
          price: 25,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        adxLine.setData(toLineData(out.adx?.series.adx));
        oscSeriesRefs.current.set("adx", adxLine);

        const plusDI = chart.addSeries(
          LineSeries,
          {
            color: DIRECTION.up,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        plusDI.setData(toLineData(out.adx?.series.plusDI));
        oscSeriesRefs.current.set("adxPlusDI", plusDI);

        const minusDI = chart.addSeries(
          LineSeries,
          {
            color: DIRECTION.down,
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        minusDI.setData(toLineData(out.adx?.series.minusDI));
        oscSeriesRefs.current.set("adxMinusDI", minusDI);
        return;
      }

      if (pane.id === "cci") {
        const cciCfg = getIndicatorConfig("cci");
        const overbought = cciCfg?.overbought ?? 100;
        const oversold = cciCfg?.oversold ?? -100;
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: overbought,
          color: OSC_LEVEL.overboughtStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.4)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: "",
        });
        line.createPriceLine({
          price: oversold,
          color: OSC_LEVEL.oversoldStrong,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.cci?.series.cci));
        oscSeriesRefs.current.set("cci", line);
        return;
      }

      if (pane.id === "bbPercentB") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.violet,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 1,
          color: OSC_LEVEL.overboughtSoft,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.createPriceLine({
          price: 0,
          color: OSC_LEVEL.oversoldSoft,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.bb?.series.bbPercentB));
        oscSeriesRefs.current.set("bbPercentB", line);
        return;
      }

      if (pane.id === "disparity") {
        const line = chart.addSeries(
          LineSeries,
          {
            color: SERIES.pink,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          },
          paneIndex,
        );
        line.createPriceLine({
          price: 0,
          color: "rgba(148, 163, 184, 0.55)",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        line.setData(toLineData(out.disparity?.series.disparity));
        oscSeriesRefs.current.set("disparity", line);
      }
    });

    syncPaneLayout({
      chart,
      container: containerRef.current,
      wrap: wrapRef.current,
      totalHeight,
      mainHeight,
      showVolume,
      oscPanes,
    });
    restoreTimeRange(savedRange);
    requestAnimationFrame(() => {
      restoreTimeRange(savedRange);
      drawChartOverlays();
    });
    // Recreate only when pane membership / volume snapshot changes — not on
    // every parent re-render (bars/indicators get new object identities often).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    oscPanes,
    showVolume,
    volumeSnapshot,
    timeframe,
    mainHeight,
    totalHeight,
  ]);
}
