import indicatorsBase from "../../config/indicators.json";
import scoringBase from "../../config/scoring.json";
import type { IndicatorsConfig, IndicatorConfigItem } from "./evaluation/types";
import { nextDefaultPeriodColor, parsePeriodColors } from "./indicatorColors";

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

function mergeIndicatorsConfig(): IndicatorsConfig {
  const o = loadOverrides();
  const merged = deepMerge(
    indicatorsBase as IndicatorsConfig,
    (o.indicators ?? {}) as DeepPartial<IndicatorsConfig>,
  );
  // Stale overrides may omit newly added plugins; keep base definitions.
  const have = new Set(merged.indicators.map((item) => item.id));
  for (const baseItem of (indicatorsBase as IndicatorsConfig).indicators) {
    if (!have.has(baseItem.id)) merged.indicators.push(baseItem);
  }
  return merged;
}

function persistIndicators(mutator: (config: IndicatorsConfig) => IndicatorsConfig): void {
  const o = loadOverrides();
  const current = mergeIndicatorsConfig();
  o.indicators = mutator(current);
  saveOverrides(o);
}

function updateIndicatorItem(
  id: string,
  updater: (item: IndicatorConfigItem) => IndicatorConfigItem,
): void {
  persistIndicators((config) => ({
    ...config,
    indicators: config.indicators.map((item) =>
      item.id === id ? updater(item) : item,
    ),
  }));
}

function periodColorsOf(item: IndicatorConfigItem): Record<string, string> {
  return parsePeriodColors(item.params.colors);
}

export function setIndicatorParam(
  id: string,
  paramKey: string,
  value: number | number[],
): void {
  updateIndicatorItem(id, (item) => ({
    ...item,
    params: { ...item.params, [paramKey]: value },
  }));
}

export function setIndicatorPeriodAt(
  id: string,
  index: number,
  value: number,
): void {
  updateIndicatorItem(id, (item) => {
    const periods = [...(item.params.periods as number[])];
    const oldPeriod = periods[index];
    periods[index] = value;
    const colors = { ...periodColorsOf(item) };
    if (oldPeriod != null && colors[String(oldPeriod)] != null) {
      colors[String(value)] = colors[String(oldPeriod)];
      delete colors[String(oldPeriod)];
    }
    return {
      ...item,
      params: { ...item.params, periods, colors },
    };
  });
}

export function addIndicatorPeriod(id: string): void {
  updateIndicatorItem(id, (item) => {
    const periods = [...((item.params.periods as number[]) ?? [])];
    const colors = { ...periodColorsOf(item) };
    const last = periods.at(-1) ?? 20;
    const next = Math.min(250, Math.max(2, last + (periods.length > 1 ? 10 : 20)));
    let candidate = next;
    while (periods.includes(candidate) && candidate <= 250) candidate += 5;
    periods.push(candidate);
    colors[String(candidate)] = nextDefaultPeriodColor(colors, periods.length - 1);
    return { ...item, params: { ...item.params, periods, colors } };
  });
}

export function removeIndicatorPeriod(id: string, index: number): void {
  updateIndicatorItem(id, (item) => {
    const periods = [...((item.params.periods as number[]) ?? [])];
    if (periods.length <= 1) return item;
    const removed = periods[index];
    periods.splice(index, 1);
    const colors = { ...periodColorsOf(item) };
    delete colors[String(removed)];
    return { ...item, params: { ...item.params, periods, colors } };
  });
}

export function setIndicatorPeriodColor(
  id: string,
  period: number,
  color: string,
): void {
  updateIndicatorItem(id, (item) => {
    const colors = { ...periodColorsOf(item), [String(period)]: color };
    return { ...item, params: { ...item.params, colors } };
  });
}

/** Named color key in params.colors (e.g. bb upper/middle/lower). */
export function setIndicatorNamedColor(
  id: string,
  name: string,
  color: string,
): void {
  updateIndicatorItem(id, (item) => {
    const colors = { ...periodColorsOf(item), [name]: color };
    return { ...item, params: { ...item.params, colors } };
  });
}

export function setIndicatorEnabled(id: string, enabled: boolean): void {
  updateIndicatorItem(id, (item) => ({ ...item, enabled }));
}

export function setIndicatorThreshold(
  id: string,
  key: "overbought" | "oversold",
  value: number,
): void {
  persistIndicators((config) => ({
    ...config,
    indicators: config.indicators.map((item) =>
      item.id === id ? { ...item, [key]: value } : item,
    ),
    signals:
      id === "rsi"
        ? config.signals.map((sig) => {
            if (key === "overbought" && sig.id === "rsi_overbought") {
              return { ...sig, value };
            }
            if (key === "oversold" && sig.id === "rsi_oversold") {
              return { ...sig, value };
            }
            return sig;
          })
        : config.signals,
  }));
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
  return mergeIndicatorsConfig();
}

export function getEffectiveScoringConfig(): typeof scoringBase {
  const o = loadOverrides();
  return deepMerge(scoringBase, (o.scoring ?? {}) as DeepPartial<typeof scoringBase>);
}

export function getIndicatorConfig(id: string): IndicatorConfigItem | undefined {
  return getEffectiveIndicatorsConfig().indicators.find((i) => i.id === id);
}
