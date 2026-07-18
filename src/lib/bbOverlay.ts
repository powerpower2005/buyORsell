/** Bollinger Band chart overlay ids (maps to series keys bbUpper/bbMiddle/bbLower). */
export type BbBandId = "upper" | "middle" | "lower";

export const BB_BAND_ORDER: BbBandId[] = ["upper", "middle", "lower"];

export const BB_BAND_META: Record<
  BbBandId,
  { label: string; labelKo: string; seriesKey: string }
> = {
  upper: { label: "Upper", labelKo: "상단", seriesKey: "bbUpper" },
  middle: { label: "Middle", labelKo: "중심", seriesKey: "bbMiddle" },
  lower: { label: "Lower", labelKo: "하단", seriesKey: "bbLower" },
};

export const BB_DEFAULT_COLORS: Record<BbBandId, string> = {
  upper: "#6366f1",
  middle: "#eab308",
  lower: "#818cf8",
};

export function resolveBbBandColor(
  colors: Record<string, string> | undefined,
  band: BbBandId,
): string {
  return colors?.[band] ?? BB_DEFAULT_COLORS[band];
}

export function bbOverlayKey(band: BbBandId): string {
  return `bb:${band}`;
}
