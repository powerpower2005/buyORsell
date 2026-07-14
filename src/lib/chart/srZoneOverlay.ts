import type {
  SrZone,
  SupportResistanceResult,
} from "@/lib/evaluation/supportResistance";
import type { SrChartToggleId } from "@/lib/srZoneStore";

export function visibleSrZones(
  sr: SupportResistanceResult | undefined,
  visibility: Record<SrChartToggleId, boolean>,
): SrZone[] {
  if (!sr) return [];
  return sr.zones.filter((z) => visibility[z.kind]);
}

export const SR_ZONE_COLORS = {
  support: {
    fill: "rgba(0, 196, 113, 0.14)",
    stroke: "rgba(0, 196, 113, 0.55)",
    label: "#00c471",
  },
  resistance: {
    fill: "rgba(240, 68, 82, 0.14)",
    stroke: "rgba(240, 68, 82, 0.55)",
    label: "#f04452",
  },
} as const;
