/**
 * Unified index of trading playbooks across indicator families.
 * Family Meta files remain the source of truth; this re-exports a flat catalog.
 */

import {
  BB_STRATEGY_META,
  BB_STRATEGY_ORDER,
  type BbStrategyId,
} from "./bbStrategyMeta";
import {
  getBbStrategyVisibility,
  setBbStrategyGroupVisible,
  setBbStrategyVisible,
} from "./bbStrategyStore";
import { bbStrategyHelp } from "./chartLayerHelp";
import {
  ICHIMOKU_STRATEGY_META,
  ICHIMOKU_STRATEGY_ORDER,
  type IchimokuStrategyId,
} from "./ichimokuStrategyMeta";
import {
  getIchimokuStrategyVisibility,
  setIchimokuStrategyGroupVisible,
  setIchimokuStrategyVisible,
} from "./ichimokuStrategyStore";
import { ichimokuStrategyHelp } from "./ichimokuStrategyHelp";
import {
  MACD_STRATEGY_META,
  MACD_STRATEGY_ORDER,
  type MacdStrategyId,
} from "./macdStrategyMeta";
import {
  getMacdStrategyVisibility,
  setMacdStrategyGroupVisible,
  setMacdStrategyVisible,
} from "./macdStrategyStore";
import { macdStrategyHelp } from "./macdStrategyHelp";
import {
  PATTERN_STRATEGY_META,
  PATTERN_STRATEGY_ORDER,
  type PatternStrategyId,
} from "./patternStrategyMeta";
import {
  getPatternStrategyVisibility,
  setPatternStrategyGroupVisible,
  setPatternStrategyVisible,
} from "./patternStrategyStore";
import { patternStrategyHelp } from "./patternStrategyHelp";
import {
  RSI_STRATEGY_META,
  RSI_STRATEGY_ORDER,
  type RsiStrategyId,
} from "./rsiStrategyMeta";
import {
  getRsiStrategyVisibility,
  setRsiStrategyGroupVisible,
  setRsiStrategyVisible,
} from "./rsiStrategyStore";
import { rsiStrategyHelp } from "./rsiStrategyHelp";
import {
  STOCH_STRATEGY_META,
  STOCH_STRATEGY_ORDER,
  type StochStrategyId,
} from "./stochStrategyMeta";
import {
  getStochStrategyVisibility,
  setStochStrategyGroupVisible,
  setStochStrategyVisible,
} from "./stochStrategyStore";
import { stochStrategyHelp } from "./stochStrategyHelp";
import type { HelpContent } from "./indicatorHelp";
import type {
  SignalStat,
  SignalStatsBundle,
} from "./evaluation/signalFollowThrough";
import type { TrendLabel } from "./types";
import {
  VOLUME_STRATEGY_META,
  VOLUME_STRATEGY_ORDER,
  type VolumeStrategyId,
} from "./volumeStrategyMeta";
import {
  getVolumeStrategyVisibility,
  setVolumeStrategyGroupVisible,
  setVolumeStrategyVisible,
} from "./volumeStrategyStore";
import { volumeStrategyHelp } from "./volumeStrategyHelp";
import {
  COMBO_STRATEGY_META,
  COMBO_STRATEGY_ORDER,
  type ComboStrategyId,
} from "./comboStrategyMeta";
import {
  getComboStrategyVisibility,
  setComboStrategyGroupVisible,
  setComboStrategyVisible,
} from "./comboStrategyStore";
import { comboStrategyHelp } from "./comboStrategyHelp";
import {
  CLASSIC_STRATEGY_META,
  CLASSIC_STRATEGY_ORDER,
  type ClassicStrategyId,
} from "./classicStrategyMeta";
import {
  getClassicStrategyVisibility,
  setClassicStrategyGroupVisible,
  setClassicStrategyVisible,
} from "./classicStrategyStore";
import { classicStrategyHelp } from "./classicStrategyHelp";

export type StrategyFamilyId =
  | "bb"
  | "classic"
  | "ichimoku"
  | "volume"
  | "rsi"
  | "macd"
  | "stoch"
  | "pattern"
  | "combo";

/** Sidebar accordion keys for nested groups under 「전체 전략」. */
export type StrategyCatalogOpenKey =
  | "allStrategiesBb"
  | "allStrategiesClassic"
  | "allStrategiesIchimoku"
  | "allStrategiesVolume"
  | "allStrategiesRsi"
  | "allStrategiesMacd"
  | "allStrategiesStoch"
  | "allStrategiesPattern"
  | "allStrategiesCombo";

export const STRATEGY_FAMILY_ORDER: StrategyFamilyId[] = [
  "bb",
  "classic",
  "ichimoku",
  "volume",
  "rsi",
  "macd",
  "stoch",
  "pattern",
  "combo",
];

export const STRATEGY_FAMILY_META: Record<
  StrategyFamilyId,
  {
    label: string;
    labelKo: string;
    catalogOpenKey: StrategyCatalogOpenKey;
  }
> = {
  bb: {
    label: "Bollinger",
    labelKo: "볼린저",
    catalogOpenKey: "allStrategiesBb",
  },
  classic: {
    label: "Classical theory",
    labelKo: "고전 이론",
    catalogOpenKey: "allStrategiesClassic",
  },
  ichimoku: {
    label: "Ichimoku",
    labelKo: "일목균형표",
    catalogOpenKey: "allStrategiesIchimoku",
  },
  volume: {
    label: "Volume",
    labelKo: "거래량",
    catalogOpenKey: "allStrategiesVolume",
  },
  rsi: {
    label: "RSI",
    labelKo: "RSI",
    catalogOpenKey: "allStrategiesRsi",
  },
  macd: {
    label: "MACD",
    labelKo: "MACD",
    catalogOpenKey: "allStrategiesMacd",
  },
  stoch: {
    label: "Stochastic",
    labelKo: "스토캐스틱",
    catalogOpenKey: "allStrategiesStoch",
  },
  pattern: {
    label: "Chart pattern",
    labelKo: "차트 패턴",
    catalogOpenKey: "allStrategiesPattern",
  },
  combo: {
    label: "Combo",
    labelKo: "복합 지표",
    catalogOpenKey: "allStrategiesCombo",
  },
};

export interface StrategyCatalogEntry {
  family: StrategyFamilyId;
  id: string;
  label: string;
  labelKo: string;
  description: string;
  markerBull: string;
  markerBear: string;
  typicalDirection: TrendLabel;
}

type StrategyMetaFields = {
  label: string;
  labelKo: string;
  description: string;
  markerBull: string;
  markerBear: string;
  typicalDirection: TrendLabel;
};

function entriesFromFamily<Id extends string>(
  family: StrategyFamilyId,
  order: readonly Id[],
  meta: Record<Id, StrategyMetaFields>,
): StrategyCatalogEntry[] {
  return order.map((id) => ({
    family,
    id,
    label: meta[id].label,
    labelKo: meta[id].labelKo,
    description: meta[id].description,
    markerBull: meta[id].markerBull,
    markerBear: meta[id].markerBear,
    typicalDirection: meta[id].typicalDirection,
  }));
}

export const STRATEGY_CATALOG: StrategyCatalogEntry[] = [
  ...entriesFromFamily("bb", BB_STRATEGY_ORDER, BB_STRATEGY_META),
  ...entriesFromFamily(
    "classic",
    CLASSIC_STRATEGY_ORDER,
    CLASSIC_STRATEGY_META,
  ),
  ...entriesFromFamily(
    "ichimoku",
    ICHIMOKU_STRATEGY_ORDER,
    ICHIMOKU_STRATEGY_META,
  ),
  ...entriesFromFamily("volume", VOLUME_STRATEGY_ORDER, VOLUME_STRATEGY_META),
  ...entriesFromFamily("rsi", RSI_STRATEGY_ORDER, RSI_STRATEGY_META),
  ...entriesFromFamily("macd", MACD_STRATEGY_ORDER, MACD_STRATEGY_META),
  ...entriesFromFamily("stoch", STOCH_STRATEGY_ORDER, STOCH_STRATEGY_META),
  ...entriesFromFamily(
    "pattern",
    PATTERN_STRATEGY_ORDER,
    PATTERN_STRATEGY_META,
  ),
  ...entriesFromFamily("combo", COMBO_STRATEGY_ORDER, COMBO_STRATEGY_META),
];

export function filterStrategyCatalog(
  query: string,
  catalog: readonly StrategyCatalogEntry[] = STRATEGY_CATALOG,
): StrategyCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...catalog];
  return catalog.filter((entry) => {
    const family = STRATEGY_FAMILY_META[entry.family];
    const hay = [
      entry.id,
      entry.label,
      entry.labelKo,
      entry.description,
      entry.markerBull,
      entry.markerBear,
      family.label,
      family.labelKo,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function strategiesByFamily(
  entries: readonly StrategyCatalogEntry[] = STRATEGY_CATALOG,
): { family: StrategyFamilyId; entries: StrategyCatalogEntry[] }[] {
  return STRATEGY_FAMILY_ORDER.map((family) => ({
    family,
    entries: entries.filter((e) => e.family === family),
  })).filter((group) => group.entries.length > 0);
}

export type StrategyVisibilityByFamily = Record<
  StrategyFamilyId,
  Record<string, boolean>
>;

export function getCatalogStrategyVisibility(): StrategyVisibilityByFamily {
  return {
    bb: getBbStrategyVisibility(),
    classic: getClassicStrategyVisibility(),
    ichimoku: getIchimokuStrategyVisibility(),
    volume: getVolumeStrategyVisibility(),
    rsi: getRsiStrategyVisibility(),
    macd: getMacdStrategyVisibility(),
    stoch: getStochStrategyVisibility(),
    pattern: getPatternStrategyVisibility(),
    combo: getComboStrategyVisibility(),
  };
}

export function setCatalogStrategyVisible(
  family: StrategyFamilyId,
  id: string,
  visible: boolean,
): void {
  switch (family) {
    case "bb":
      setBbStrategyVisible(id as BbStrategyId, visible);
      break;
    case "classic":
      setClassicStrategyVisible(id as ClassicStrategyId, visible);
      break;
    case "ichimoku":
      setIchimokuStrategyVisible(id as IchimokuStrategyId, visible);
      break;
    case "volume":
      setVolumeStrategyVisible(id as VolumeStrategyId, visible);
      break;
    case "rsi":
      setRsiStrategyVisible(id as RsiStrategyId, visible);
      break;
    case "macd":
      setMacdStrategyVisible(id as MacdStrategyId, visible);
      break;
    case "stoch":
      setStochStrategyVisible(id as StochStrategyId, visible);
      break;
    case "pattern":
      setPatternStrategyVisible(id as PatternStrategyId, visible);
      break;
    case "combo":
      setComboStrategyVisible(id as ComboStrategyId, visible);
      break;
  }
}

export function setCatalogFamilyVisible(
  family: StrategyFamilyId,
  visible: boolean,
): void {
  switch (family) {
    case "bb":
      setBbStrategyGroupVisible(visible);
      break;
    case "classic":
      setClassicStrategyGroupVisible(visible);
      break;
    case "ichimoku":
      setIchimokuStrategyGroupVisible(visible);
      break;
    case "volume":
      setVolumeStrategyGroupVisible(visible);
      break;
    case "rsi":
      setRsiStrategyGroupVisible(visible);
      break;
    case "macd":
      setMacdStrategyGroupVisible(visible);
      break;
    case "stoch":
      setStochStrategyGroupVisible(visible);
      break;
    case "pattern":
      setPatternStrategyGroupVisible(visible);
      break;
    case "combo":
      setComboStrategyGroupVisible(visible);
      break;
  }
}

export function setAllCatalogStrategiesVisible(visible: boolean): void {
  for (const family of STRATEGY_FAMILY_ORDER) {
    setCatalogFamilyVisible(family, visible);
  }
}

const STATS_KEY: Record<StrategyFamilyId, keyof SignalStatsBundle> = {
  bb: "bbStrategy",
  classic: "classicStrategy",
  ichimoku: "ichimokuStrategy",
  volume: "volumeStrategy",
  rsi: "rsiStrategy",
  macd: "macdStrategy",
  stoch: "stochStrategy",
  pattern: "patternStrategy",
  combo: "comboStrategy",
};

const EMPTY_STAT: SignalStat = { samples: 0, wins: 0, ratePct: null };

export function getCatalogStrategyStat(
  family: StrategyFamilyId,
  id: string,
  stats: SignalStatsBundle | null | undefined,
): SignalStat {
  if (!stats) return EMPTY_STAT;
  return stats[STATS_KEY[family]][id] ?? EMPTY_STAT;
}

export function getCatalogStrategyHelp(
  family: StrategyFamilyId,
  id: string,
): HelpContent {
  switch (family) {
    case "bb":
      return bbStrategyHelp(id);
    case "classic":
      return classicStrategyHelp(id as ClassicStrategyId);
    case "ichimoku":
      return ichimokuStrategyHelp(id as IchimokuStrategyId);
    case "volume":
      return volumeStrategyHelp(id as VolumeStrategyId);
    case "rsi":
      return rsiStrategyHelp(id as RsiStrategyId);
    case "macd":
      return macdStrategyHelp(id as MacdStrategyId);
    case "stoch":
      return stochStrategyHelp(id as StochStrategyId);
    case "pattern":
      return patternStrategyHelp(id as PatternStrategyId);
    case "combo":
      return comboStrategyHelp(id as ComboStrategyId);
  }
}
