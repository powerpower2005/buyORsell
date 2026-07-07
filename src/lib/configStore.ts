import indicatorsBase from "../../config/indicators.json";
import scoringBase from "../../config/scoring.json";
import type { IndicatorsConfig } from "./evaluation/types";

const OVERRIDE_KEY = "gf:config:overrides";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  const out = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const bv = base[key];
    const ov = override[key];
    if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object") {
      out[key] = deepMerge(bv as T[keyof T], ov as DeepPartial<T[keyof T]>) as T[keyof T];
    } else if (ov !== undefined) {
      out[key] = ov as T[keyof T];
    }
  }
  return out;
}

export function loadOverrides(): DeepPartial<{
  indicators: IndicatorsConfig;
  scoring: typeof scoringBase;
}> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(
  overrides: DeepPartial<{ indicators: IndicatorsConfig; scoring: typeof scoringBase }>,
): void {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
}

export function setIndicatorParam(
  id: string,
  paramKey: string,
  value: number | number[],
): void {
  const o = loadOverrides();
  if (!o.indicators) o.indicators = { schemaVersion: 1, indicators: [], signals: [] };
  const items = [...(indicatorsBase.indicators as IndicatorsConfig["indicators"])];
  const merged = deepMerge({ indicators: items, signals: indicatorsBase.signals }, o.indicators as never);
  const idx = merged.indicators.findIndex((i) => i.id === id);
  if (idx >= 0) {
    merged.indicators[idx] = {
      ...merged.indicators[idx],
      params: { ...merged.indicators[idx].params, [paramKey]: value },
    };
  }
  o.indicators = merged as IndicatorsConfig;
  saveOverrides(o);
}

export function setCategoryWeight(presetKey: string, category: string, weight: number): void {
  const o = loadOverrides();
  if (!o.scoring) o.scoring = structuredClone(scoringBase);
  const preset = (o.scoring.presets as Record<string, { categories: { name: string; weight: number }[] }>)[presetKey];
  if (preset) {
    const cat = preset.categories.find((c) => c.name === category);
    if (cat) cat.weight = weight;
  }
  saveOverrides(o);
}

export function resetOverrides(): void {
  localStorage.removeItem(OVERRIDE_KEY);
}

export function getEffectiveIndicatorsConfig(): IndicatorsConfig {
  const o = loadOverrides();
  return deepMerge(
    indicatorsBase as IndicatorsConfig,
    (o.indicators ?? {}) as DeepPartial<IndicatorsConfig>,
  );
}

export function getEffectiveScoringConfig(): typeof scoringBase {
  const o = loadOverrides();
  return deepMerge(scoringBase, (o.scoring ?? {}) as DeepPartial<typeof scoringBase>);
}
