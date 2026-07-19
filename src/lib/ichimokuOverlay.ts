/** Ichimoku chart overlay ids (maps to plugin series keys). */
export type IchimokuPartId =
  | "tenkan"
  | "kijun"
  | "chikou"
  | "spanA"
  | "spanB"
  | "cloud";

export const ICHIMOKU_PART_ORDER: IchimokuPartId[] = [
  "tenkan",
  "kijun",
  "chikou",
  "spanA",
  "spanB",
  "cloud",
];

/** Line parts drawn with LineSeries (cloud is canvas fill). */
export const ICHIMOKU_LINE_ORDER: Exclude<IchimokuPartId, "cloud">[] = [
  "tenkan",
  "kijun",
  "chikou",
  "spanA",
  "spanB",
];

export const ICHIMOKU_PART_META: Record<
  IchimokuPartId,
  { label: string; labelKo: string; seriesKey: string | null }
> = {
  tenkan: {
    label: "Tenkan-sen",
    labelKo: "전환선",
    seriesKey: "tenkan",
  },
  kijun: { label: "Kijun-sen", labelKo: "기준선", seriesKey: "kijun" },
  chikou: {
    label: "Chikou Span",
    labelKo: "후행스팬",
    seriesKey: "chikou",
  },
  spanA: {
    label: "Senkou Span A",
    labelKo: "선행스팬1",
    seriesKey: "spanA",
  },
  spanB: {
    label: "Senkou Span B",
    labelKo: "선행스팬2",
    seriesKey: "spanB",
  },
  cloud: { label: "Kumo", labelKo: "구름층", seriesKey: null },
};

export const ICHIMOKU_DEFAULT_COLORS: Record<
  Exclude<IchimokuPartId, "cloud">,
  string
> = {
  tenkan: "#ef4444",
  kijun: "#3b82f6",
  chikou: "#a855f7",
  spanA: "#22c55e",
  spanB: "#f97316",
};

export function resolveIchimokuColor(
  colors: Record<string, string> | undefined,
  part: Exclude<IchimokuPartId, "cloud">,
): string {
  return colors?.[part] ?? ICHIMOKU_DEFAULT_COLORS[part];
}

export function ichimokuOverlayKey(part: IchimokuPartId): string {
  return `ichimoku:${part}`;
}
