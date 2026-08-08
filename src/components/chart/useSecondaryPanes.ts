import { useEffect, type MutableRefObject, type RefObject } from "react";
import {
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type Time,
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
  VOLUME_BAR,
} from "@/lib/chart/chartTheme";
import {
  addPaneDataLine,
  addPaneRefLevel,
  paddedDataAutoscale,
  timeExtent,
} from "@/lib/chart/paneScale";
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

function track(
  refs: MutableRefObject<Map<string, OscSeries>>,
  key: string,
  series: OscSeries,
): OscSeries {
  refs.current.set(key, series);
  return series;
}

function addRefs(
  chart: IChartApi,
  paneIndex: number,
  refs: MutableRefObject<Map<string, OscSeries>>,
  extent: { from: Time; to: Time } | null,
  levels: Array<{ key: string; price: number; color: string; label?: boolean }>,
) {
  if (!extent) return;
  for (const lv of levels) {
    track(
      refs,
      lv.key,
      addPaneRefLevel(
        chart,
        paneIndex,
        lv.price,
        lv.color,
        extent.from,
        extent.to,
        lv.label ?? false,
      ),
    );
  }
}

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
          autoscaleInfoProvider: paddedDataAutoscale(0.08),
        },
        volumePane,
      );
      volume.setData(toVolumeData(bars));
      volume.priceScale().applyOptions({
        scaleMargins: { ...SCALE_MARGINS.volumePane },
        autoScale: true,
      });
      volumeRef.current = volume;

      for (const avg of volumeSnapshot.averages) {
        if (!avg.available || !avg.series.length) continue;
        const volMaWidth: 1 | 2 = avg.period <= 7 ? 2 : 1;
        const line = addPaneDataLine(chart, volumePane, {
          color: volumeMaColor(avg.period),
          lineWidth: volMaWidth,
        });
        // Volume pane uses volumePane margins (set above); re-apply after helper.
        line.priceScale().applyOptions({
          scaleMargins: { ...SCALE_MARGINS.volumePane },
          autoScale: true,
        });
        line.setData(
          avg.series
            .filter((p) => Number.isFinite(p.value))
            .map((p) => ({
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
      const refs = oscSeriesRefs;

      if (pane.id === "rsi") {
        const overbought = getIndicatorConfig("rsi")?.overbought ?? 70;
        const oversold = getIndicatorConfig("rsi")?.oversold ?? 30;
        const levels = [overbought, oversold];
        const data = toLineData(out.rsi?.series.rsi);
        const line = track(
          refs,
          "rsi",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.purple,
            lineWidth: 2,
            includeLevels: levels,
          }),
        );
        line.setData(data);
        const extent = timeExtent(data);
        addRefs(chart, paneIndex, refs, extent, [
          {
            key: "rsiOb",
            price: overbought,
            color: OSC_LEVEL.overbought,
            label: true,
          },
          {
            key: "rsiOs",
            price: oversold,
            color: OSC_LEVEL.oversold,
            label: true,
          },
        ]);

        if (out.rsi?.series.rsiUpper?.length) {
          const s = track(
            refs,
            "rsiUpper",
            addPaneDataLine(chart, paneIndex, {
              color: SERIES.pink,
              lineWidth: 1,
            }),
          );
          s.setData(toLineData(out.rsi.series.rsiUpper));
        }
        if (out.rsi?.series.rsiLower?.length) {
          const s = track(
            refs,
            "rsiLower",
            addPaneDataLine(chart, paneIndex, {
              color: SERIES.teal,
              lineWidth: 1,
            }),
          );
          s.setData(toLineData(out.rsi.series.rsiLower));
        }
        if (out.rsi?.series.rsiMid?.length) {
          const s = track(
            refs,
            "rsiMid",
            addPaneDataLine(chart, paneIndex, {
              color: SERIES.yellow,
              lineWidth: 1,
            }),
          );
          s.setData(toLineData(out.rsi.series.rsiMid));
        }
        if (out.rsi?.series.rsiWeighted?.length) {
          const s = track(
            refs,
            "rsiWeighted",
            addPaneDataLine(chart, paneIndex, {
              color: SERIES.slateDark,
              lineWidth: 2,
            }),
          );
          s.setData(toLineData(out.rsi.series.rsiWeighted));
        }
        return;
      }

      if (pane.id === "macd") {
        const hist = chart.addSeries(
          HistogramSeries,
          {
            lastValueVisible: false,
            priceLineVisible: false,
            autoscaleInfoProvider: paddedDataAutoscale(0.12, [0]),
          },
          paneIndex,
        );
        hist.priceScale().applyOptions({
          scaleMargins: { ...SCALE_MARGINS.oscillator },
          autoScale: true,
        });
        const histData = (out.macd?.series.macdHist ?? [])
          .filter((p) => Number.isFinite(p.value))
          .map((p) => ({
            time: p.date as `${number}-${number}-${number}`,
            value: p.value,
            color: p.value >= 0 ? VOLUME_BAR.up : VOLUME_BAR.down,
          }));
        hist.setData(histData);
        track(refs, "macdHist", hist);

        const macdData = toLineData(out.macd?.series.macd);
        const macdLine = track(
          refs,
          "macd",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.blue,
            lineWidth: 2,
            includeLevels: [0],
          }),
        );
        macdLine.setData(macdData);
        addRefs(chart, paneIndex, refs, timeExtent(macdData), [
          { key: "macdZero", price: 0, color: "rgba(148, 163, 184, 0.55)" },
        ]);

        const signal = track(
          refs,
          "macdSignal",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.amber,
            lineWidth: 1,
          }),
        );
        signal.setData(toLineData(out.macd?.series.macdSignal));
        return;
      }

      if (pane.id === "stoch") {
        const overbought = getIndicatorConfig("stoch")?.overbought ?? 80;
        const oversold = getIndicatorConfig("stoch")?.oversold ?? 20;
        const levels = [overbought, 50, oversold];
        const kData = toLineData(out.stoch?.series.stochK);
        const kLine = track(
          refs,
          "stochK",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.teal,
            lineWidth: 2,
            includeLevels: levels,
          }),
        );
        kLine.setData(kData);
        addRefs(chart, paneIndex, refs, timeExtent(kData), [
          {
            key: "stochOb",
            price: overbought,
            color: OSC_LEVEL.overboughtStrong,
            label: true,
          },
          {
            key: "stochMid",
            price: 50,
            color: "rgba(148, 163, 184, 0.45)",
          },
          {
            key: "stochOs",
            price: oversold,
            color: OSC_LEVEL.oversoldStrong,
            label: true,
          },
        ]);
        const dLine = track(
          refs,
          "stochD",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.orange,
            lineWidth: 1,
          }),
        );
        dLine.setData(toLineData(out.stoch?.series.stochD));
        return;
      }

      if (pane.id === "mfi") {
        const levels = [80, 20];
        const data = toLineData(out.mfi?.series.mfi);
        const line = track(
          refs,
          "mfi",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.cyan,
            lineWidth: 2,
            includeLevels: levels,
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "mfiOb",
            price: 80,
            color: OSC_LEVEL.overboughtStrong,
            label: true,
          },
          {
            key: "mfiOs",
            price: 20,
            color: OSC_LEVEL.oversoldStrong,
            label: true,
          },
        ]);
        return;
      }

      if (pane.id === "atr") {
        const line = track(
          refs,
          "atr",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.slate,
            lineWidth: 2,
          }),
        );
        line.setData(toLineData(out.atr?.series.atr));
        return;
      }

      if (pane.id === "obv") {
        const line = track(
          refs,
          "obv",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.sky,
            lineWidth: 2,
          }),
        );
        line.setData(toLineData(out.obv?.series.obv));
        if (out.obv?.series.obvSignal?.length) {
          const sig = track(
            refs,
            "obvSignal",
            addPaneDataLine(chart, paneIndex, {
              color: "rgba(148, 163, 184, 0.85)",
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
            }),
          );
          sig.setData(toLineData(out.obv.series.obvSignal));
        }
        return;
      }

      if (pane.id === "ad") {
        const line = track(
          refs,
          "ad",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.violet,
            lineWidth: 2,
          }),
        );
        line.setData(toLineData(out.ad?.series.ad));
        return;
      }

      if (pane.id === "chaikin") {
        const data = toLineData(out.chaikin?.series.chaikin);
        const line = track(
          refs,
          "chaikin",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.pink,
            lineWidth: 2,
            includeLevels: [0],
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "chaikinZero",
            price: 0,
            color: "rgba(148, 163, 184, 0.55)",
          },
        ]);
        return;
      }

      if (pane.id === "eom") {
        const data = toLineData(out.eom?.series.eom);
        const line = track(
          refs,
          "eom",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.teal,
            lineWidth: 1,
            includeLevels: [0],
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          { key: "eomZero", price: 0, color: "rgba(148, 163, 184, 0.55)" },
        ]);
        if (out.eom?.series.eomSmooth?.length) {
          const smooth = track(
            refs,
            "eomSmooth",
            addPaneDataLine(chart, paneIndex, {
              color: SERIES.amber,
              lineWidth: 2,
            }),
          );
          smooth.setData(toLineData(out.eom.series.eomSmooth));
        }
        return;
      }

      if (pane.id === "obvMid") {
        const line = track(
          refs,
          "obvMid",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.cyan,
            lineWidth: 2,
          }),
        );
        line.setData(toLineData(out.obvMid?.series.obvMid));
        return;
      }

      if (pane.id === "equivolume") {
        const data = toLineData(out.equivolume?.series.boxRatio);
        const line = track(
          refs,
          "equivolume",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.orange,
            lineWidth: 2,
            includeLevels: [1],
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          { key: "equivOne", price: 1, color: "rgba(148, 163, 184, 0.45)" },
        ]);
        return;
      }

      if (pane.id === "adx") {
        const data = toLineData(out.adx?.series.adx);
        const adxLine = track(
          refs,
          "adx",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.yellow,
            lineWidth: 2,
            includeLevels: [25],
          }),
        );
        adxLine.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "adx25",
            price: 25,
            color: "rgba(148, 163, 184, 0.55)",
            label: true,
          },
        ]);
        const plusDI = track(
          refs,
          "adxPlusDI",
          addPaneDataLine(chart, paneIndex, {
            color: DIRECTION.up,
            lineWidth: 1,
          }),
        );
        plusDI.setData(toLineData(out.adx?.series.plusDI));
        const minusDI = track(
          refs,
          "adxMinusDI",
          addPaneDataLine(chart, paneIndex, {
            color: DIRECTION.down,
            lineWidth: 1,
          }),
        );
        minusDI.setData(toLineData(out.adx?.series.minusDI));
        return;
      }

      if (pane.id === "cci") {
        const cciCfg = getIndicatorConfig("cci");
        const overbought = cciCfg?.overbought ?? 100;
        const oversold = cciCfg?.oversold ?? -100;
        const levels = [overbought, 0, oversold];
        const data = toLineData(out.cci?.series.cci);
        const line = track(
          refs,
          "cci",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.violet,
            lineWidth: 2,
            includeLevels: levels,
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "cciOb",
            price: overbought,
            color: OSC_LEVEL.overboughtStrong,
            label: true,
          },
          { key: "cciZero", price: 0, color: "rgba(148, 163, 184, 0.4)" },
          {
            key: "cciOs",
            price: oversold,
            color: OSC_LEVEL.oversoldStrong,
            label: true,
          },
        ]);
        return;
      }

      if (pane.id === "bbPercentB") {
        const levels = [1, 0];
        const data = toLineData(out.bb?.series.bbPercentB);
        const line = track(
          refs,
          "bbPercentB",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.violet,
            lineWidth: 2,
            includeLevels: levels,
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "bbPbTop",
            price: 1,
            color: OSC_LEVEL.overboughtSoft,
            label: true,
          },
          {
            key: "bbPbBot",
            price: 0,
            color: OSC_LEVEL.oversoldSoft,
            label: true,
          },
        ]);
        return;
      }

      if (pane.id === "disparity") {
        const data = toLineData(out.disparity?.series.disparity);
        const line = track(
          refs,
          "disparity",
          addPaneDataLine(chart, paneIndex, {
            color: SERIES.pink,
            lineWidth: 2,
            includeLevels: [0],
          }),
        );
        line.setData(data);
        addRefs(chart, paneIndex, refs, timeExtent(data), [
          {
            key: "disparityZero",
            price: 0,
            color: "rgba(148, 163, 184, 0.55)",
            label: true,
          },
        ]);
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
