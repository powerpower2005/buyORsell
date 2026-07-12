/** Distinct colors for chart overlays (avoid candle green/red). */
export const INDICATOR_COLOR_OPTIONS = [
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#eab308",
  "#6366f1",
  "#14b8a6",
] as const;

export type IndicatorColor = (typeof INDICATOR_COLOR_OPTIONS)[number];

export function resolvePeriodColor(
  colors: Record<string, string> | undefined,
  period: number,
  fallbackIndex: number,
): string {
  const picked = colors?.[String(period)];
  if (picked) return picked;
  return INDICATOR_COLOR_OPTIONS[fallbackIndex % INDICATOR_COLOR_OPTIONS.length];
}

export function nextDefaultPeriodColor(
  colors: Record<string, string> | undefined,
  index: number,
): string {
  const used = new Set(Object.values(colors ?? {}));
  for (const color of INDICATOR_COLOR_OPTIONS) {
    if (!used.has(color)) return color;
  }
  return INDICATOR_COLOR_OPTIONS[index % INDICATOR_COLOR_OPTIONS.length];
}

export function parsePeriodColors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
