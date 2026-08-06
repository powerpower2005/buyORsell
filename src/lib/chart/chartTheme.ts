/**
 * Chart color & layout theme — single source for chart presentation.
 *
 * Principles:
 * - DIRECTION.up / DIRECTION.down: price direction ONLY
 *   (candles, volume bars, % change text, PnL numbers). Nowhere else.
 * - Indicator / strategy series: SERIES palette only. No green / red.
 * - Bullish / bearish *signals*: SIGNAL (teal ↔ orange) — same hue wheel
 *   axis as direction but distinct from candle green/red so overlays don't mix.
 * - Period variants of one indicator (MA5/20/60): maColor() brightness ramp.
 * - Bollinger upper/lower: BOLLINGER same-hue opacity variants (not cyan vs emerald).
 */

import { ColorType, type DeepPartial, type ChartOptions, type CandlestickStyleOptions } from "lightweight-charts";

// ─── Surfaces / chrome ───────────────────────────────────────────────────────

export const CHART_SURFACE = {
  background: "#252525",
  text: "#8b95a1",
  textMuted: "#6b7684",
  border: "#3a3a3c",
  paneSeparator: "#3a3a3c",
  paneSeparatorHover: "rgba(139, 149, 161, 0.15)",
  ink: "#ffffff",
  inkMuted: "#e2e8f0",
  inkSoft: "#f8fafc",
} as const;

// ─── Direction (price only) ──────────────────────────────────────────────────

export const DIRECTION = {
  up: "#00c471",
  down: "#f04452",
} as const;

export type DirectionConvention = "global" | "kr";

/** Global: up=green. KR equities convention: up=red. */
export function directionPair(convention: DirectionConvention = "global") {
  if (convention === "kr") {
    return { up: DIRECTION.down, down: DIRECTION.up };
  }
  return { up: DIRECTION.up, down: DIRECTION.down };
}

// ─── Signal (bullish / bearish markers — not candle colors) ──────────────────

export const SIGNAL = {
  bullish: "#2dd4bf", // teal
  bearish: "#fb923c", // orange
  neutral: "#fbbf24", // amber
} as const;

export function signalColor(
  direction: "bullish" | "bearish" | "neutral" | string,
): string {
  if (direction === "bullish") return SIGNAL.bullish;
  if (direction === "bearish") return SIGNAL.bearish;
  return SIGNAL.neutral;
}

// ─── Series palette (indicators — no green/red) ──────────────────────────────

export const SERIES = {
  blue: "#60a5fa",
  sky: "#38bdf8",
  cyan: "#22d3ee",
  teal: "#2dd4bf",
  indigo: "#818cf8",
  violet: "#a78bfa",
  purple: "#c084fc",
  fuchsia: "#e879f9",
  pink: "#f472b6",
  rose: "#fb7185",
  amber: "#fbbf24",
  yellow: "#facc15",
  orange: "#fb923c",
  orangeDeep: "#f97316",
  slate: "#94a3b8",
  slateDark: "#1f2937",
  accent: "#3182f6",
} as const;

/** Ordered multi-series picks (ichimoku, oscillators, etc.). */
export const SERIES_RAMP = [
  SERIES.sky,
  SERIES.violet,
  SERIES.amber,
  SERIES.pink,
  SERIES.cyan,
  SERIES.orange,
  SERIES.indigo,
  SERIES.teal,
  SERIES.yellow,
  SERIES.fuchsia,
] as const;

// ─── Moving average brightness ramp (short → bright) ─────────────────────────

const MA_RAMP = [
  "#e0f2fe", // shortest / brightest
  "#7dd3fc",
  "#38bdf8",
  "#0ea5e9",
  "#0284c7",
  "#0369a1",
  "#075985", // longest / darkest
] as const;

/**
 * Color for MA period index among visible MAs (0 = shortest).
 * Same indicator family → one hue ramp, not unrelated palette colors.
 */
export function maColor(index: number, total = MA_RAMP.length): string {
  if (total <= 1) return MA_RAMP[0];
  const t = Math.min(1, Math.max(0, index / Math.max(1, total - 1)));
  const i = Math.round(t * (MA_RAMP.length - 1));
  return MA_RAMP[i]!;
}

// ─── Bollinger (same hue, opacity steps) ─────────────────────────────────────

export const BOLLINGER = {
  mid: "rgba(56, 189, 248, 0.95)",
  upper: "rgba(56, 189, 248, 0.55)",
  lower: "rgba(56, 189, 248, 0.35)",
  fill: "rgba(56, 189, 248, 0.08)",
} as const;

// ─── Grid / scale ────────────────────────────────────────────────────────────

export const GRID = {
  vertLines: { visible: false, color: "transparent" },
  horzLines: { visible: true, color: "rgba(255, 255, 255, 0.045)" },
} as const;

export const SCALE_MARGINS = {
  main: { top: 0.14, bottom: 0.10 },
  volume: { top: 0.72, bottom: 0.02 },
  oscillator: { top: 0.12, bottom: 0.12 },
} as const;

/** Volume histogram bar fills (direction with alpha). */
export const VOLUME_BAR = {
  up: "rgba(0, 196, 113, 0.55)",
  down: "rgba(240, 68, 82, 0.55)",
} as const;
export const OSC_LEVEL = {
  overbought: "rgba(251, 146, 60, 0.35)",
  oversold: "rgba(45, 212, 191, 0.35)",
  overboughtStrong: "rgba(251, 146, 60, 0.45)",
  oversoldStrong: "rgba(45, 212, 191, 0.45)",
  overboughtSoft: "rgba(251, 146, 60, 0.4)",
  oversoldSoft: "rgba(45, 212, 191, 0.4)",
} as const;

/** Support / resistance zone paints (signal hues). */
export const SR_ZONE = {
  support: {
    fill: "rgba(45, 212, 191, 0.14)",
    stroke: "rgba(45, 212, 191, 0.55)",
    label: SIGNAL.bullish,
  },
  resistance: {
    fill: "rgba(251, 146, 60, 0.14)",
    stroke: "rgba(251, 146, 60, 0.55)",
    label: SIGNAL.bearish,
  },
} as const;

// ─── Layout budget ───────────────────────────────────────────────────────────

export const PANE_HEIGHT = {
  volume: 100,
  oscillator: 120,
  macd: 140,
} as const;

/**
 * Main pane height that yields to aux panes on small viewports.
 * Floors: mobile 300 / tablet 420 / desktop 560.
 */
export function computeMainPaneHeight(opts: {
  viewportWidth: number;
  viewportHeight: number;
  auxPaneHeights: number[];
  maxMain?: number;
}): number {
  const { viewportWidth, viewportHeight, auxPaneHeights } = opts;
  const maxMain = opts.maxMain ?? 920;
  const auxTotal = auxPaneHeights.reduce((a, b) => a + b, 0);

  const floor =
    viewportWidth < 480 ? 300 : viewportWidth < 900 ? 420 : 560;

  // Keep chart stack roughly within ~1.6–1.85 viewports on phone.
  const budgetRatio = viewportWidth < 480 ? 1.55 : viewportWidth < 900 ? 1.35 : 1.2;
  const stackBudget = Math.round(viewportHeight * budgetRatio);
  const mainFromBudget = Math.max(floor, stackBudget - auxTotal);
  const mainFromViewport = Math.round(viewportHeight * 0.74);

  return Math.min(maxMain, Math.max(floor, Math.min(mainFromBudget, Math.max(floor, mainFromViewport))));
}

// ─── lightweight-charts option helpers ───────────────────────────────────────

export function chartOptions(partial?: {
  width?: number;
  height?: number;
}): DeepPartial<ChartOptions> {
  return {
    width: partial?.width,
    height: partial?.height,
    layout: {
      background: { type: ColorType.Solid, color: CHART_SURFACE.background },
      textColor: CHART_SURFACE.text,
      attributionLogo: false,
      panes: {
        separatorColor: CHART_SURFACE.paneSeparator,
        separatorHoverColor: CHART_SURFACE.paneSeparatorHover,
      },
    },
    grid: {
      vertLines: { ...GRID.vertLines },
      horzLines: { ...GRID.horzLines },
    },
    rightPriceScale: {
      borderColor: CHART_SURFACE.border,
      scaleMargins: { ...SCALE_MARGINS.main },
    },
  };
}

export function candleOptions(
  convention: DirectionConvention = "global",
): DeepPartial<CandlestickStyleOptions> {
  const { up, down } = directionPair(convention);
  return {
    upColor: up,
    downColor: down,
    borderVisible: false,
    wickUpColor: up,
    wickDownColor: down,
  };
}
