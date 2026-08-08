import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { IndicatorResults, OHLCVBar } from "@/lib/types";
import type { ClassicStrategyResult } from "@/lib/evaluation/classicStrategies";
import type { ClassicStrategyId } from "@/lib/classicStrategyMeta";
import type { ChartPatternInstance } from "@/lib/evaluation/chartPatterns";
import { CHART_PATTERN_META } from "@/lib/chartPatternMeta";
import type { ElliottWaveResult } from "@/lib/evaluation/elliottWaves";
import {
  anyElliottWaveVisible,
  type ElliottWaveToggleId,
} from "@/lib/elliottWaveStore";
import type { Trendline } from "@/lib/evaluation/trendlines";
import { TRENDLINE_COLORS } from "@/lib/trendlineStore";
import { SR_ZONE_COLORS } from "@/lib/chart/srZoneOverlay";
import type { SrZone } from "@/lib/evaluation/supportResistance";
import { drawRiskRewardPlans } from "@/lib/chart/riskRewardOverlay";
import type { RiskRewardPlan } from "@/lib/evaluation/riskReward";
import { getIndicatorConfig } from "@/lib/configStore";
import {
  CHART_SURFACE,
  SIGNAL,
} from "@/lib/chart/chartTheme";
import {
  FIB_LEVEL_COLORS,
  FIB_CONFLUENCE_COLOR,
  FIB_RETRACEMENT_LEVELS,
  fibRetracementPrice,
  findFibConfluences,
  getFibPendingLow,
  type FibExtraId,
  type FibLevelRatio,
  type FibRetracement,
} from "@/lib/fibonacciStore";
import type { IchimokuPartId } from "@/lib/ichimokuOverlay";

export type UseOverlayCanvasArgs = {
  chartRef: RefObject<IChartApi | null>;
  candleRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
  barsRef: MutableRefObject<OHLCVBar[]>;
  srZones: SrZone[];
  visibleTrendlines: Trendline[];
  chartTrendlineColors?: Record<string, string>;
  visibleClassicalInstances: ChartPatternInstance[];
  classicStrategies?: ClassicStrategyResult;
  chartClassicStrategyVisibility?: Partial<Record<ClassicStrategyId, boolean>>;
  fibRetracement?: FibRetracement | null;
  fibLevelVisibility?: Record<FibLevelRatio, boolean>;
  fibExtraVisibility?: Partial<Record<FibExtraId, boolean>>;
  elliottWaves?: ElliottWaveResult;
  chartElliottWaveVisibility?: Record<ElliottWaveToggleId, boolean>;
  riskRewardPlans: RiskRewardPlan[];
  indicators?: IndicatorResults;
  ichimokuVisibility?: Partial<Record<IchimokuPartId, boolean>>;
};

/** Custom canvas overlays: Ichimoku cloud, S/R, trendlines, fib, Elliott, R:R, etc. */
export function useOverlayCanvas({
  chartRef,
  candleRef,
  wrapRef,
  barsRef,
  srZones,
  visibleTrendlines,
  chartTrendlineColors,
  visibleClassicalInstances,
  classicStrategies,
  chartClassicStrategyVisibility,
  fibRetracement,
  fibLevelVisibility,
  fibExtraVisibility,
  elliottWaves,
  chartElliottWaveVisibility,
  riskRewardPlans,
  indicators,
  ichimokuVisibility,
}: UseOverlayCanvasArgs) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const fibRetRef = useRef<FibRetracement | null>(fibRetracement ?? null);
  fibRetRef.current = fibRetracement ?? null;
  const fibLevelsRef = useRef<Record<FibLevelRatio, boolean> | undefined>(
    fibLevelVisibility,
  );
  fibLevelsRef.current = fibLevelVisibility;
  const fibExtrasRef = useRef<Partial<Record<FibExtraId, boolean>> | undefined>(
    fibExtraVisibility,
  );
  fibExtrasRef.current = fibExtraVisibility;

  const srZonesRef = useRef(srZones);
  srZonesRef.current = srZones;

  const kumoCloudRef = useRef<{
    visible: boolean;
    spanA: { date: string; value: number }[];
    spanB: { date: string; value: number }[];
  }>({ visible: false, spanA: [], spanB: [] });

  useEffect(() => {
    const cfg = getIndicatorConfig("ichimoku");
    const out = indicators?.indicators.ichimoku;
    const showCloud =
      (ichimokuVisibility?.cloud ?? false) && !!cfg?.enabled && !!out;
    kumoCloudRef.current = {
      visible: showCloud,
      spanA: out?.series.spanA ?? [],
      spanB: out?.series.spanB ?? [],
    };
  }, [indicators, ichimokuVisibility]);


  const trendlinesRef = useRef(visibleTrendlines);
  trendlinesRef.current = visibleTrendlines;
  const trendlineColorsRef = useRef(chartTrendlineColors ?? {});
  trendlineColorsRef.current = chartTrendlineColors ?? {};

  const riskRewardPlansRef = useRef(riskRewardPlans);
  riskRewardPlansRef.current = riskRewardPlans;

  const classicalInstancesRef = useRef(visibleClassicalInstances);
  classicalInstancesRef.current = visibleClassicalInstances;
  const classicStrategiesRef = useRef(classicStrategies);
  classicStrategiesRef.current = classicStrategies;
  const chartClassicStrategyVisibilityRef = useRef(
    chartClassicStrategyVisibility,
  );
  chartClassicStrategyVisibilityRef.current = chartClassicStrategyVisibility;

  const elliottWavesRef = useRef(elliottWaves);
  elliottWavesRef.current = elliottWaves;
  const chartElliottWaveVisibilityRef = useRef(chartElliottWaveVisibility);
  chartElliottWaveVisibilityRef.current = chartElliottWaveVisibility;

  // ─── Overlay draw ──────────────────────────────────────────────────────────

  const drawChartOverlays = () => {
    const canvas = overlayRef.current;
    const wrap = wrapRef.current;
    const series = candleRef.current;
    const chart = chartRef.current;
    if (!canvas || !wrap || !series || !chart) return;

    const width = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (width <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, h);

    // Price overlays belong on pane 0 only (oscillator panes share this canvas).
    const pane0H = chart.panes()[0]?.getHeight() ?? h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, pane0H);
    ctx.clip();

    // ── Ichimoku Kumo (cloud) ────────────────────────────────────────────────
    const kumo = kumoCloudRef.current;
    if (kumo.visible && kumo.spanA.length && kumo.spanB.length) {
      const bMap = new Map(kumo.spanB.map((p) => [p.date, p.value]));
      const pts: { date: string; a: number; b: number }[] = [];
      for (const p of kumo.spanA) {
        const bv = bMap.get(p.date);
        if (bv == null) continue;
        pts.push({ date: p.date, a: p.value, b: bv });
      }
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1]!;
        const p1 = pts[i]!;
        const x0 = chart
          .timeScale()
          .timeToCoordinate(p0.date as `${number}-${number}-${number}`);
        const x1 = chart
          .timeScale()
          .timeToCoordinate(p1.date as `${number}-${number}-${number}`);
        const yA0 = series.priceToCoordinate(p0.a);
        const yB0 = series.priceToCoordinate(p0.b);
        const yA1 = series.priceToCoordinate(p1.a);
        const yB1 = series.priceToCoordinate(p1.b);
        if (
          x0 == null ||
          x1 == null ||
          yA0 == null ||
          yB0 == null ||
          yA1 == null ||
          yB1 == null
        ) {
          continue;
        }
        const bull = p1.a >= p1.b;
        ctx.fillStyle = bull
          ? "rgba(34, 197, 94, 0.16)"
          : "rgba(239, 68, 68, 0.16)";
        ctx.beginPath();
        ctx.moveTo(x0, yA0);
        ctx.lineTo(x1, yA1);
        ctx.lineTo(x1, yB1);
        ctx.lineTo(x0, yB0);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── S/R zone bands ────────────────────────────────────────────────────────
    for (const zone of srZonesRef.current) {
      const y1 = series.priceToCoordinate(zone.high);
      const y2 = series.priceToCoordinate(zone.low);
      if (y1 == null || y2 == null) continue;
      const top = Math.min(y1, y2);
      const bandH = Math.max(2, Math.abs(y2 - y1));
      const colors = SR_ZONE_COLORS[zone.kind];

      ctx.fillStyle = colors.fill;
      ctx.fillRect(0, top, width, bandH);

      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y1);
      ctx.lineTo(width, y1);
      ctx.moveTo(0, y2);
      ctx.lineTo(width, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dynamic trendlines
    for (const line of trendlinesRef.current) {
      const x1 = chart
        .timeScale()
        .timeToCoordinate(line.date1 as `${number}-${number}-${number}`);
      const x2 = chart
        .timeScale()
        .timeToCoordinate(line.date2 as `${number}-${number}-${number}`);
      const endDate = barsRef.current[line.endBarIndex]?.date ?? line.date2;
      const xEnd = chart
        .timeScale()
        .timeToCoordinate(endDate as `${number}-${number}-${number}`);
      const y1 = series.priceToCoordinate(line.y1);
      const y2 = series.priceToCoordinate(line.y2);
      const yEnd = series.priceToCoordinate(line.yAtEnd);
      if (x1 == null || y1 == null || yEnd == null) continue;
      const color =
        trendlineColorsRef.current[line.id] ?? TRENDLINE_COLORS[line.kind];
      ctx.strokeStyle = color;
      ctx.lineWidth = line.broken ? 1 : 2;
      ctx.setLineDash(line.broken ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (x2 != null && y2 != null) ctx.lineTo(x2, y2);
      if (xEnd != null) ctx.lineTo(xEnd, yEnd);
      else ctx.lineTo(width, yEnd);
      ctx.stroke();
      ctx.setLineDash([]);

      // Anchor dots
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();
      if (x2 != null && y2 != null) {
        ctx.beginPath();
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Classical chart pattern geometry
    for (const inst of classicalInstancesRef.current) {
      const color = CHART_PATTERN_META[inst.id].color;
      for (const s of inst.segments) {
        const sx = chart
          .timeScale()
          .timeToCoordinate(s.date1 as `${number}-${number}-${number}`);
        const ex = chart
          .timeScale()
          .timeToCoordinate(s.date2 as `${number}-${number}-${number}`);
        const sy = series.priceToCoordinate(s.y1);
        const ey = series.priceToCoordinate(s.y2);
        if (sx == null || ex == null || sy == null || ey == null) continue;
        ctx.strokeStyle = color;
        ctx.lineWidth = s.role === "neckline" ? 2 : 1.25;
        ctx.globalAlpha = inst.status === "forming" ? 0.55 : 0.9;
        ctx.setLineDash(
          s.role === "neckline" || inst.status === "forming" ? [5, 3] : [],
        );
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const p of inst.pivots) {
        const px = chart
          .timeScale()
          .timeToCoordinate(p.date as `${number}-${number}-${number}`);
        const py = series.priceToCoordinate(p.price);
        if (px == null || py == null) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Gann fans & retracement zones (classic gann_zone strategy) ───────────
    const classic = classicStrategiesRef.current;
    const classicVis = chartClassicStrategyVisibilityRef.current;
    if (classicVis?.gann_zone && classic) {
      for (const zone of classic.gannZones ?? []) {
        const yTop = series.priceToCoordinate(zone.rzh);
        const yBot = series.priceToCoordinate(zone.rzl);
        if (yTop == null || yBot == null) continue;
        const top = Math.min(yTop, yBot);
        const bandH = Math.max(2, Math.abs(yBot - yTop));
        ctx.fillStyle =
          zone.bias === "bullish"
            ? "rgba(34, 197, 94, 0.12)"
            : "rgba(239, 68, 68, 0.12)";
        ctx.fillRect(0, top, width, bandH);
        ctx.save();
        ctx.strokeStyle =
          zone.bias === "bullish"
            ? "rgba(34, 197, 94, 0.35)"
            : "rgba(239, 68, 68, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(width, yTop);
        ctx.moveTo(0, yBot);
        ctx.lineTo(width, yBot);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const barsSnap = barsRef.current;
      const endIdx = barsSnap.length - 1;
      const endDate = endIdx >= 0 ? barsSnap[endIdx]!.date : null;
      for (const ray of classic.gannFans ?? []) {
        const x0 = chart
          .timeScale()
          .timeToCoordinate(ray.anchorDate as `${number}-${number}-${number}`);
        const y0 = series.priceToCoordinate(ray.anchorPrice);
        if (x0 == null || y0 == null || !endDate) continue;
        const endPrice =
          ray.anchorPrice + ray.slope * (endIdx - ray.anchorIndex);
        const x1 = chart
          .timeScale()
          .timeToCoordinate(endDate as `${number}-${number}-${number}`);
        const y1 = series.priceToCoordinate(endPrice);
        if (x1 == null || y1 == null) continue;
        const color =
          ray.bias === "bullish"
            ? "rgba(34, 197, 94, 0.45)"
            : "rgba(239, 68, 68, 0.45)";
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = ray.kind === "1x1" ? 1.5 : 1;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash(ray.kind === "2x1" ? [3, 3] : []);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // ── Fibonacci retracement ─────────────────────────────────────────────────
    const fib = fibRetRef.current;
    const levelVis = fibLevelsRef.current;

    if (fib && fib.high.price > fib.low.price) {
      const xLow = chart
        .timeScale()
        .timeToCoordinate(fib.low.date as `${number}-${number}-${number}`);
      const xHigh = chart
        .timeScale()
        .timeToCoordinate(fib.high.date as `${number}-${number}-${number}`);

      if (xLow != null && xHigh != null) {
        const xStart = Math.min(xLow, xHigh);
        const extras = fibExtrasRef.current;
        const drawAnchors = extras?.anchors === true;
        const drawConfluence = extras?.confluence === true;

        const confluences = drawConfluence
          ? findFibConfluences(fib, srZonesRef.current, levelVis)
          : [];
        const confluenceRatios = new Set(confluences.map((c) => c.ratio));

        // 0% / 100% guides (no price text — values live in legend)
        if (drawAnchors) {
          const y0 = series.priceToCoordinate(fib.high.price);
          if (y0 != null) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,255,255,0.28)";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(xStart, y0);
            ctx.lineTo(width, y0);
            ctx.stroke();
            ctx.restore();
          }

          const y100 = series.priceToCoordinate(fib.low.price);
          if (y100 != null) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,255,255,0.28)";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(xStart, y100);
            ctx.lineTo(width, y100);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Confluence highlight bands (full width, gold/amber)
        for (const hit of confluences) {
          const yTop = series.priceToCoordinate(hit.zoneHigh);
          const yBot = series.priceToCoordinate(hit.zoneLow);
          if (yTop == null || yBot == null) continue;
          const cfTop = Math.min(yTop, yBot);
          const cfH = Math.max(4, Math.abs(yBot - yTop));

          ctx.fillStyle = "rgba(251,191,36,0.22)";
          ctx.fillRect(0, cfTop, width, cfH);

          ctx.save();
          ctx.strokeStyle = FIB_CONFLUENCE_COLOR;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(0, cfTop);
          ctx.lineTo(width, cfTop);
          ctx.moveTo(0, cfTop + cfH);
          ctx.lineTo(width, cfTop + cfH);
          ctx.stroke();
          ctx.restore();
        }

        // Fib level lines (dashed, from xStart to right edge)
        for (const ratio of FIB_RETRACEMENT_LEVELS) {
          if (!levelVis || levelVis[ratio] !== true) continue;
          const fibPrice = fibRetracementPrice(
            fib.low.price,
            fib.high.price,
            ratio,
          );
          const yFib = series.priceToCoordinate(fibPrice);
          if (yFib == null) continue;

          const hasConf = confluenceRatios.has(ratio);
          const color = FIB_LEVEL_COLORS[ratio];

          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = hasConf ? 2.5 : 1.5;
          ctx.globalAlpha = hasConf ? 1 : 0.82;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(xStart, yFib);
          ctx.lineTo(width, yFib);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ── Elliott wave zigzag overlays ─────────────────────────────────────────
    const ew = elliottWavesRef.current;
    const ewVis = chartElliottWaveVisibilityRef.current;
    if (ew && ewVis && anyElliottWaveVisible(ewVis)) {
      const patterns = ew.primary.length
        ? ew.primary
        : ew.patterns.slice(0, 2);
      for (const pattern of patterns) {
        if (pattern.kind === "impulse" && !ewVis.impulse) continue;
        if (pattern.kind === "corrective" && !ewVis.corrective) continue;

        const color = pattern.direction === "bullish" ? SIGNAL.bullish : SIGNAL.bearish;
        ctx.strokeStyle = color;
        ctx.lineWidth = pattern.kind === "impulse" ? 2 : 1.5;
        ctx.setLineDash(pattern.kind === "corrective" ? [5, 4] : []);

        const pivots = pattern.pivots;
        if (pivots.length >= 2) {
          ctx.beginPath();
          let started = false;
          for (const p of pivots) {
            const x = chart
              .timeScale()
              .timeToCoordinate(p.date as `${number}-${number}-${number}`);
            const y = series.priceToCoordinate(p.price);
            if (x == null || y == null) continue;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          if (started) ctx.stroke();
        }
        ctx.setLineDash([]);

        if (ewVis.labels) {
          for (const p of pivots) {
            if (p.label == null) continue;
            const x = chart
              .timeScale()
              .timeToCoordinate(p.date as `${number}-${number}-${number}`);
            const y = series.priceToCoordinate(p.price);
            if (x == null || y == null) continue;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = CHART_SURFACE.ink;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = CHART_SURFACE.ink;
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.label, x, y);
          }
        }
      }
    }

    // ── Pending low anchor dot ────────────────────────────────────────────────
    const pending = getFibPendingLow();
    if (pending) {
      const xPend = chart
        .timeScale()
        .timeToCoordinate(pending.date as `${number}-${number}-${number}`);
      const yPend = series.priceToCoordinate(pending.price);
      if (xPend != null && yPend != null) {
        ctx.save();
        ctx.fillStyle = SIGNAL.bullish;
        ctx.shadowColor = SIGNAL.bullish;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(xPend, yPend, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = CHART_SURFACE.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xPend, yPend, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── Risk/reward v1 (entry / stop / target) ────────────────────────────────
    drawRiskRewardPlans(
      ctx,
      chart,
      series,
      barsRef.current,
      riskRewardPlansRef.current,
    );

    ctx.restore();
  };

  // ─── SR zone redraw ────────────────────────────────────────────────────────

  useEffect(() => {
    drawChartOverlays();
    const chart = chartRef.current;
    if (!chart) return;
    const onRange = () => drawChartOverlays();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srZones]);

  // ─── Fib retracement / level visibility redraw ────────────────────────────

  useEffect(() => {
    drawChartOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fibRetracement,
    fibLevelVisibility,
    fibExtraVisibility,
    visibleTrendlines,
    srZones,
    chartTrendlineColors,
    visibleClassicalInstances,
    classicStrategies,
    chartClassicStrategyVisibility,
    ichimokuVisibility,
    indicators,
    elliottWaves,
    chartElliottWaveVisibility,
    riskRewardPlans,
  ]);


  return { overlayRef, drawChartOverlays };
}
