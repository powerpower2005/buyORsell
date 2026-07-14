export type SrChartToggleId = "support" | "resistance";

export const SR_CHART_TOGGLE_ORDER: SrChartToggleId[] = [
  "support",
  "resistance",
];

export const SR_CHART_TOGGLE_META: Record<
  SrChartToggleId,
  { label: string; labelKo: string; description: string }
> = {
  support: {
    label: "Support zones",
    labelKo: "지지 가격대",
    description:
      "스윙 저점이 모인 수평 가격대입니다. 정확한 한 값이 아니라 밴드(존)로 표시합니다.",
  },
  resistance: {
    label: "Resistance zones",
    labelKo: "저항 가격대",
    description:
      "스윙 고점이 모인 수평 가격대입니다. 터치가 많을수록 강한 구간으로 봅니다.",
  },
};

const STORAGE_KEY = "gf:config:sr-zones-chart";

type Overrides = Partial<Record<SrChartToggleId, boolean>>;

function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Overrides): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getSrChartVisibility(): Record<SrChartToggleId, boolean> {
  const overrides = loadOverrides();
  const out = {} as Record<SrChartToggleId, boolean>;
  for (const id of SR_CHART_TOGGLE_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setSrChartVisible(id: SrChartToggleId, visible: boolean): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function anySrChartVisible(
  visibility: Record<SrChartToggleId, boolean>,
): boolean {
  return SR_CHART_TOGGLE_ORDER.some((id) => visibility[id]);
}
