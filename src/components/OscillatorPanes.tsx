import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
} from "lightweight-charts";
import type { IndicatorResults, SeriesPoint, Timeframe } from "@/lib/types";
import { getIndicatorConfig } from "@/lib/configStore";
import {
  AUX_INDICATOR_META,
  AUX_INDICATOR_ORDER,
  type AuxIndicatorId,
} from "@/lib/auxIndicatorStore";

const PANE_HEIGHT = 128;
const MACD_PANE_HEIGHT = 148;

const CHART_LAYOUT = {
  background: { color: "#252525" },
  textColor: "#8b95a1",
} as const;

const CHART_GRID = {
  vertLines: { color: "#3a3a3c" },
  horzLines: { color: "#3a3a3c" },
} as const;

function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function toLineData(points: SeriesPoint[] | undefined) {
  if (!points?.length) return [];
  return points.map((p) => ({
    time: p.date as `${number}-${number}-${number}`,
    value: p.value,
  }));
}

type PaneSpec = {
  id: AuxIndicatorId;
  title: string;
  latest: string;
  height: number;
};

function buildPaneSpecs(
  indicators: IndicatorResults | undefined,
  visibility: Partial<Record<AuxIndicatorId, boolean>> | undefined,
): PaneSpec[] {
  if (!indicators) return [];
  const panes: PaneSpec[] = [];

  for (const id of AUX_INDICATOR_ORDER) {
    if (visibility?.[id] !== true) continue;
    const meta = AUX_INDICATOR_META[id];

    if (id === "rsi") {
      const cfg = getIndicatorConfig("rsi");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.rsi;
      if (!out?.series.rsi?.length) continue;
      const period = (cfg.params.period as number | undefined) ?? 14;
      panes.push({
        id,
        title: `${meta.labelKo}(${period})`,
        latest: fmt(out.latest.rsi),
        height: PANE_HEIGHT,
      });
      continue;
    }

    if (id === "macd") {
      const cfg = getIndicatorConfig("macd");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.macd;
      if (!out?.series.macd?.length) continue;
      panes.push({
        id,
        title: "MACD",
        latest: `H ${fmt(out.latest.macdHist, 4)}`,
        height: MACD_PANE_HEIGHT,
      });
      continue;
    }

    if (id === "mfi") {
      const cfg = getIndicatorConfig("mfi");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.mfi;
      if (!out?.series.mfi?.length) continue;
      const period = (cfg.params.period as number | undefined) ?? 14;
      panes.push({
        id,
        title: `${meta.labelKo}(${period})`,
        latest: fmt(out.latest.mfi),
        height: PANE_HEIGHT,
      });
      continue;
    }

    if (id === "atr") {
      const cfg = getIndicatorConfig("atr");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.atr;
      if (!out?.series.atr?.length) continue;
      panes.push({
        id,
        title: meta.labelKo,
        latest: fmt(out.latest.atr),
        height: PANE_HEIGHT,
      });
      continue;
    }

    if (id === "bbPercentB") {
      const cfg = getIndicatorConfig("bb");
      if (!cfg?.enabled) continue;
      const out = indicators.indicators.bb;
      if (!out?.series.bbPercentB?.length) continue;
      panes.push({
        id,
        title: meta.labelKo,
        latest: fmt(out.latest.bbPercentB, 3),
        height: PANE_HEIGHT,
      });
    }
  }

  return panes;
}

function applySeriesData(
  id: AuxIndicatorId,
  chart: IChartApi,
  indicators: IndicatorResults,
  seriesBag: Map<string, ISeriesApi<"Line"> | ISeriesApi<"Histogram">>,
) {
  if (id === "rsi") {
    const out = indicators.indicators.rsi;
    let line = seriesBag.get("rsi") as ISeriesApi<"Line"> | undefined;
    if (!line) {
      line = chart.addLineSeries({
        color: "#c084fc",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("rsi", line);
      const overbought =
        (getIndicatorConfig("rsi")?.overbought as number | undefined) ?? 70;
      const oversold =
        (getIndicatorConfig("rsi")?.oversold as number | undefined) ?? 30;
      line.createPriceLine({
        price: overbought,
        color: "rgba(240, 68, 82, 0.55)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
      line.createPriceLine({
        price: oversold,
        color: "rgba(0, 196, 113, 0.55)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }
    line.setData(toLineData(out?.series.rsi));
    return;
  }

  if (id === "macd") {
    const out = indicators.indicators.macd;
    let hist = seriesBag.get("macdHist") as ISeriesApi<"Histogram"> | undefined;
    if (!hist) {
      hist = chart.addHistogramSeries({
        lastValueVisible: false,
        priceLineVisible: false,
      });
      seriesBag.set("macdHist", hist);
    }
    hist.setData(
      (out?.series.macdHist ?? []).map((p) => ({
        time: p.date as `${number}-${number}-${number}`,
        value: p.value,
        color:
          p.value >= 0
            ? "rgba(0, 196, 113, 0.55)"
            : "rgba(240, 68, 82, 0.55)",
      })),
    );

    let macdLine = seriesBag.get("macd") as ISeriesApi<"Line"> | undefined;
    if (!macdLine) {
      macdLine = chart.addLineSeries({
        color: "#60a5fa",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("macd", macdLine);
    }
    macdLine.setData(toLineData(out?.series.macd));

    let signal = seriesBag.get("macdSignal") as ISeriesApi<"Line"> | undefined;
    if (!signal) {
      signal = chart.addLineSeries({
        color: "#fbbf24",
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("macdSignal", signal);
    }
    signal.setData(toLineData(out?.series.macdSignal));
    return;
  }

  if (id === "mfi") {
    const out = indicators.indicators.mfi;
    let line = seriesBag.get("mfi") as ISeriesApi<"Line"> | undefined;
    if (!line) {
      line = chart.addLineSeries({
        color: "#22d3ee",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("mfi", line);
      line.createPriceLine({
        price: 80,
        color: "rgba(240, 68, 82, 0.45)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
      line.createPriceLine({
        price: 20,
        color: "rgba(0, 196, 113, 0.45)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }
    line.setData(toLineData(out?.series.mfi));
    return;
  }

  if (id === "atr") {
    const out = indicators.indicators.atr;
    let line = seriesBag.get("atr") as ISeriesApi<"Line"> | undefined;
    if (!line) {
      line = chart.addLineSeries({
        color: "#94a3b8",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("atr", line);
    }
    line.setData(toLineData(out?.series.atr));
    return;
  }

  if (id === "bbPercentB") {
    const out = indicators.indicators.bb;
    let line = seriesBag.get("bbPercentB") as ISeriesApi<"Line"> | undefined;
    if (!line) {
      line = chart.addLineSeries({
        color: "#a78bfa",
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      seriesBag.set("bbPercentB", line);
      line.createPriceLine({
        price: 1,
        color: "rgba(240, 68, 82, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
      line.createPriceLine({
        price: 0,
        color: "rgba(0, 196, 113, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }
    line.setData(toLineData(out?.series.bbPercentB));
  }
}

interface PaneChartProps {
  id: AuxIndicatorId;
  title: string;
  latest: string;
  height: number;
  showTimeScale: boolean;
  indicators: IndicatorResults;
  timeframe: Timeframe;
  mainChart: IChartApi | null;
  syncLock: MutableRefObject<boolean>;
}

function OscillatorPaneChart({
  id,
  title,
  latest,
  height,
  showTimeScale,
  indicators,
  timeframe,
  mainChart,
  syncLock,
}: PaneChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesBag = useRef(
    new Map<string, ISeriesApi<"Line"> | ISeriesApi<"Histogram">>(),
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 600,
      height,
      layout: CHART_LAYOUT,
      grid: CHART_GRID,
      rightPriceScale: {
        borderColor: "#3a3a3c",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        visible: showTimeScale,
        borderColor: "#3a3a3c",
        timeVisible: true,
      },
      crosshair: {
        horzLine: { labelVisible: true },
        vertLine: { labelVisible: false },
      },
    });

    chartRef.current = chart;
    seriesBag.current = new Map();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesBag.current = new Map();
    };
    // Recreate when timeframe changes so bar spacing matches main chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, id]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      height,
      timeScale: { visible: showTimeScale },
    });
  }, [height, showTimeScale]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !indicators) return;
    applySeriesData(id, chart, indicators, seriesBag.current);
    if (mainChart) {
      const range = mainChart.timeScale().getVisibleLogicalRange();
      if (range) {
        syncLock.current = true;
        chart.timeScale().setVisibleLogicalRange(range);
        syncLock.current = false;
      } else {
        chart.timeScale().fitContent();
      }
    } else {
      chart.timeScale().fitContent();
    }
  }, [id, indicators, mainChart, syncLock, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainChart) return;

    const fromMain = (range: LogicalRange | null) => {
      if (!range || syncLock.current) return;
      syncLock.current = true;
      chart.timeScale().setVisibleLogicalRange(range);
      syncLock.current = false;
    };
    const fromPane = (range: LogicalRange | null) => {
      if (!range || syncLock.current) return;
      syncLock.current = true;
      mainChart.timeScale().setVisibleLogicalRange(range);
      syncLock.current = false;
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(fromMain);
    chart.timeScale().subscribeVisibleLogicalRangeChange(fromPane);

    const range = mainChart.timeScale().getVisibleLogicalRange();
    if (range) {
      syncLock.current = true;
      chart.timeScale().setVisibleLogicalRange(range);
      syncLock.current = false;
    }

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(fromMain);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(fromPane);
    };
  }, [mainChart, syncLock, timeframe, id]);

  return (
    <div className="border-t border-border/80">
      <div className="flex items-baseline justify-between gap-2 px-1 py-1 text-[11px] text-text-secondary">
        <span className="font-medium text-text-primary">{title}</span>
        <span className="tabular-nums text-text-tertiary">{latest}</span>
      </div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height }}
        aria-label={`${id}-pane`}
      />
    </div>
  );
}

interface Props {
  indicators?: IndicatorResults;
  visibility?: Partial<Record<AuxIndicatorId, boolean>>;
  timeframe: Timeframe;
  mainChart: IChartApi | null;
}

export function OscillatorPanes({
  indicators,
  visibility,
  timeframe,
  mainChart,
}: Props) {
  const syncLock = useRef(false);
  const panes = useMemo(
    () => buildPaneSpecs(indicators, visibility),
    [indicators, visibility],
  );

  if (!panes.length || !indicators) return null;

  return (
    <div className="mt-1 overflow-hidden rounded-b bg-[#252525]">
      {panes.map((pane, index) => (
        <OscillatorPaneChart
          key={pane.id}
          id={pane.id}
          title={pane.title}
          latest={pane.latest}
          height={pane.height}
          showTimeScale={index === panes.length - 1}
          indicators={indicators}
          timeframe={timeframe}
          mainChart={mainChart}
          syncLock={syncLock}
        />
      ))}
    </div>
  );
}
