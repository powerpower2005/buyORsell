/** Chart toggles for Elliott wave overlay. */

export type ElliottWaveToggleId = "impulse" | "corrective" | "labels";

export const ELLIOTT_WAVE_TOGGLE_ORDER: ElliottWaveToggleId[] = [
  "impulse",
  "corrective",
  "labels",
];

export const ELLIOTT_WAVE_TOGGLE_META: Record<
  ElliottWaveToggleId,
  { label: string; labelKo: string; description: string }
> = {
  impulse: {
    label: "Impulse 1-5",
    labelKo: "추진 1–5",
    description:
      "절대규칙(2파 저점·3파 최단 금지·4파 비중첩)을 통과한 추진 파동 후보를 표시합니다.",
  },
  corrective: {
    label: "Corrective A-B-C",
    labelKo: "조정 A–B–C",
    description: "피보 휴리스틱을 통과한 조정 파동 후보를 표시합니다.",
  },
  labels: {
    label: "Wave labels",
    labelKo: "번호 라벨",
    description: "꼭짓점에 1–5·A–B–C 숫자를 그립니다. 끄면 지그재그 선만 보입니다.",
  },
};

const STORAGE_KEY = "gf:config:elliott-wave-chart";

type Overrides = Partial<Record<ElliottWaveToggleId, boolean>>;

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

export function getElliottWaveVisibility(): Record<
  ElliottWaveToggleId,
  boolean
> {
  const overrides = loadOverrides();
  const out = {} as Record<ElliottWaveToggleId, boolean>;
  for (const id of ELLIOTT_WAVE_TOGGLE_ORDER) {
    out[id] = overrides[id] ?? false;
  }
  return out;
}

export function setElliottWaveVisible(
  id: ElliottWaveToggleId,
  visible: boolean,
): void {
  const overrides = loadOverrides();
  overrides[id] = visible;
  saveOverrides(overrides);
}

export function setElliottWaveGroupVisible(visible: boolean): void {
  const overrides = loadOverrides();
  for (const id of ELLIOTT_WAVE_TOGGLE_ORDER) {
    overrides[id] = visible;
  }
  saveOverrides(overrides);
}

export function anyElliottWaveVisible(
  visibility: Record<ElliottWaveToggleId, boolean>,
): boolean {
  return visibility.impulse || visibility.corrective;
}
