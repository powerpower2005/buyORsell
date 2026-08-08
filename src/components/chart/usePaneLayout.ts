import {
  useEffect,
  useState,
  type RefObject,
} from "react";
import type { IChartApi, LogicalRange } from "lightweight-charts";
import {
  VOLUME_PANE_HEIGHT,
  type OscPaneSpec,
} from "@/lib/chart/oscillatorPaneSpecs";

export type SyncPaneLayoutArgs = {
  chart: IChartApi;
  container: HTMLDivElement | null;
  wrap: HTMLDivElement | null;
  totalHeight: number;
  mainHeight: number;
  showVolume: boolean;
  oscPanes: OscPaneSpec[];
};

/** Single call site for chart + DOM + per-pane height sync. */
export function syncPaneLayout({
  chart,
  container,
  wrap,
  totalHeight,
  mainHeight,
  showVolume,
  oscPanes,
}: SyncPaneLayoutArgs) {
  chart.applyOptions({ height: totalHeight });
  if (container) {
    container.style.height = `${totalHeight}px`;
  }
  if (wrap) {
    wrap.style.height = `${totalHeight}px`;
  }
  const panes = chart.panes();
  if (panes[0]) panes[0].setHeight(mainHeight);
  const volOffset = showVolume ? 1 : 0;
  if (showVolume && panes[1]) panes[1].setHeight(VOLUME_PANE_HEIGHT);
  oscPanes.forEach((pane, i) => {
    const api = panes[i + 1 + volOffset];
    if (api) api.setHeight(pane.height);
  });
}

export type UsePaneLayoutArgs = {
  chartRef: RefObject<IChartApi | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
  totalHeight: number;
  mainHeight: number;
  showVolume: boolean;
  oscPanes: OscPaneSpec[];
  timeframe: string;
  captureTimeRange: () => LogicalRange | null;
  restoreTimeRange: (range: LogicalRange | null) => void;
  drawChartOverlays: () => void;
};

/** Pane height sync + secondary-pane label top measurement. */
export function usePaneLayout({
  chartRef,
  containerRef,
  wrapRef,
  totalHeight,
  mainHeight,
  showVolume,
  oscPanes,
  timeframe,
  captureTimeRange,
  restoreTimeRange,
  drawChartOverlays,
}: UsePaneLayoutArgs) {
  const [paneLabelTops, setPaneLabelTops] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const savedRange = captureTimeRange();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight, mainHeight, oscPanes, showVolume]);

  // Keep pane name tags aligned when the user drags pane separators.
  useEffect(() => {
    const measure = () => {
      const chart = chartRef.current;
      const wrap = wrapRef.current;
      if (!chart || !wrap) return;
      const wrapTop = wrap.getBoundingClientRect().top;
      const panes = chart.panes();
      const next: Record<string, number> = {};
      let paneIndex = 1;
      if (showVolume) {
        const el = panes[paneIndex]?.getHTMLElement();
        if (el) {
          next.volume = el.getBoundingClientRect().top - wrapTop + 4;
        }
        paneIndex += 1;
      }
      oscPanes.forEach((pane, i) => {
        const el = panes[paneIndex + i]?.getHTMLElement();
        if (el) {
          next[pane.id] = el.getBoundingClientRect().top - wrapTop + 4;
        }
      });
      setPaneLabelTops((prev) => {
        const keys = Object.keys(next);
        if (
          keys.length === Object.keys(prev).length &&
          keys.every((k) => prev[k] === next[k])
        ) {
          return prev;
        }
        return next;
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);

    const chart = chartRef.current;
    const observed = new Set<Element>();
    const ro = new ResizeObserver(() => measure());
    if (wrapRef.current) {
      ro.observe(wrapRef.current);
      observed.add(wrapRef.current);
    }
    if (chart) {
      for (const pane of chart.panes()) {
        const el = pane.getHTMLElement();
        if (el && !observed.has(el)) {
          ro.observe(el);
          observed.add(el);
        }
      }
    }

    // Separator drag updates heights continuously; poll while pointer is down.
    const wrap = wrapRef.current;
    let dragging = false;
    let rafLoop = 0;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      // Pane separators live inside the chart; any drag on chart can resize panes.
      if (!containerRef.current?.contains(t)) return;
      dragging = true;
      const tick = () => {
        if (!dragging) return;
        measure();
        rafLoop = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(rafLoop);
      rafLoop = requestAnimationFrame(tick);
    };
    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      cancelAnimationFrame(rafLoop);
      measure();
    };
    wrap?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafLoop);
      ro.disconnect();
      wrap?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [oscPanes, showVolume, totalHeight, timeframe, mainHeight]);

  return { paneLabelTops, syncPaneLayout };
}
