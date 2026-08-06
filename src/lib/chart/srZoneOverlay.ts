import type {
  SrZone,
  SupportResistanceResult,
} from "@/lib/evaluation/supportResistance";
import type { SrChartToggleId } from "@/lib/srZoneStore";
import { SR_ZONE } from "@/lib/chart/chartTheme";

export function visibleSrZones(
  sr: SupportResistanceResult | undefined,
  visibility: Record<SrChartToggleId, boolean>,
): SrZone[] {
  if (!sr) return [];
  return sr.zones.filter((z) => visibility[z.kind]);
}

export const SR_ZONE_COLORS = SR_ZONE;
