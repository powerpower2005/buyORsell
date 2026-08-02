/**
 * When a playbook is turned on, show its related chart layers.
 * When turned off, hide those layers only if no other enabled playbook still needs them.
 */

import {
  getAuxIndicatorVisibility,
  setAuxIndicatorVisible,
  type AuxIndicatorId,
} from "./auxIndicatorStore";
import {
  COMBO_STRATEGY_META,
  COMBO_STRATEGY_ORDER,
  type ComboStrategyId,
} from "./comboStrategyMeta";
import {
  getBbOverlayVisibility,
  getIchimokuOverlayVisibility,
  isIndicatorOverlayVisible,
  isVolumeOverlayVisible,
  setBbOverlayGroupVisible,
  setIchimokuOverlayGroupVisible,
  setIndicatorOverlayVisible,
  setVolumeOverlayVisible,
} from "./indicatorOverlayStore";
import type { BbStrategyId } from "./bbStrategyMeta";
import { BB_STRATEGY_ORDER } from "./bbStrategyMeta";
import type { MacdStrategyId } from "./macdStrategyMeta";
import { MACD_STRATEGY_ORDER } from "./macdStrategyMeta";
import type { StochStrategyId } from "./stochStrategyMeta";
import { STOCH_STRATEGY_ORDER } from "./stochStrategyMeta";
import type { VolumeStrategyId } from "./volumeStrategyMeta";
import { VOLUME_STRATEGY_ORDER } from "./volumeStrategyMeta";
import type { ClassicStrategyId } from "./classicStrategyMeta";
import { CLASSIC_STRATEGY_ORDER } from "./classicStrategyMeta";
import { RSI_STRATEGY_ORDER } from "./rsiStrategyMeta";
import { ICHIMOKU_STRATEGY_ORDER } from "./ichimokuStrategyMeta";
import { PATTERN_STRATEGY_ORDER } from "./patternStrategyMeta";
import { getBbStrategyVisibility } from "./bbStrategyStore";
import { getIchimokuStrategyVisibility } from "./ichimokuStrategyStore";
import { getVolumeStrategyVisibility } from "./volumeStrategyStore";
import { getRsiStrategyVisibility } from "./rsiStrategyStore";
import { getMacdStrategyVisibility } from "./macdStrategyStore";
import { getStochStrategyVisibility } from "./stochStrategyStore";
import { getPatternStrategyVisibility } from "./patternStrategyStore";
import { getComboStrategyVisibility } from "./comboStrategyStore";
import { getClassicStrategyVisibility } from "./classicStrategyStore";
import { setTrendlineChartVisible } from "./trendlineStore";
import {
  getSrChartVisibility,
  setSrChartVisible,
  type SrChartToggleId,
} from "./srZoneStore";
import { BB_BAND_ORDER } from "./bbOverlay";
import { ICHIMOKU_PART_ORDER } from "./ichimokuOverlay";

/** Keep local to avoid import cycles with strategyCatalog ↔ stores. */
export type StrategyFamily =
  | "bb"
  | "ichimoku"
  | "volume"
  | "rsi"
  | "macd"
  | "stoch"
  | "pattern"
  | "combo"
  | "classic";

export type LayerKey =
  | `aux:${AuxIndicatorId}`
  | `sma:${number}`
  | `ema:${number}`
  | `sr:${SrChartToggleId}`
  | "bb"
  | "ichimoku"
  | "volume";

function aux(id: AuxIndicatorId): LayerKey {
  return `aux:${id}`;
}

function sma(period: number): LayerKey {
  return `sma:${period}`;
}

function ema(period: number): LayerKey {
  return `ema:${period}`;
}

function sr(id: SrChartToggleId): LayerKey {
  return `sr:${id}`;
}

function add(out: Set<LayerKey>, ...keys: LayerKey[]): void {
  for (const key of keys) out.add(key);
}

function layersForCombo(id: ComboStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>();
  const meta = COMBO_STRATEGY_META[id];
  for (const a of meta.relatedAux) add(out, aux(a));
  if (meta.showUnderVolume) add(out, "volume");
  if (meta.showUnderBb) add(out, "bb");
  return out;
}

function layersForBb(id: BbStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>(["bb"]);
  switch (id) {
    case "trend_follow":
      add(out, aux("bbPercentB"), aux("mfi"));
      break;
    case "divergence":
      add(out, aux("rsi"));
      break;
    default:
      break;
  }
  return out;
}

function layersForMacd(id: MacdStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>([aux("macd")]);
  if (id === "macd_rsi_confirm") add(out, aux("rsi"));
  return out;
}

function layersForStoch(id: StochStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>([aux("stoch")]);
  if (id === "stoch_ma20_cross") add(out, sma(20));
  return out;
}

function layersForClassic(id: ClassicStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>();
  switch (id) {
    case "ma_golden_dead":
      add(out, sma(20), sma(50));
      break;
    case "fib_wave_pullback":
    case "gann_zone":
      break;
  }
  return out;
}

function layersForVolume(id: VolumeStrategyId): Set<LayerKey> {
  const out = new Set<LayerKey>(["volume"]);
  switch (id) {
    case "heatmap_volume":
    case "volume_fight":
    case "vsa":
      add(out, aux("psar"), ema(60));
      break;
    case "vwap_pullback":
    case "vwap_band_reversal":
    case "vwap_switching":
    case "vwap_trendline":
    case "failed_breakout_short":
      add(out, aux("vwap"));
      break;
    case "vwap_ema_squeeze":
      add(out, aux("vwap"), ema(12));
      break;
    case "forever_vwap_flip":
      add(out, aux("forever_vwap"));
      break;
    case "obv_divergence":
    case "obv_fast_thrust":
      add(out, aux("obv"));
      break;
    case "obv_keltner":
      add(out, aux("obv"), aux("keltner"));
      break;
    case "ad_divergence":
      add(out, aux("ad"));
      break;
    case "chaikin_zero":
    case "chaikin_divergence":
      add(out, aux("chaikin"));
      break;
    case "equivolume_oversquare":
      add(out, aux("equivolume"), aux("eom"));
      break;
    case "eom_zero":
      add(out, aux("eom"));
      break;
  }
  return out;
}

function layersForPattern(): Set<LayerKey> {
  return new Set<LayerKey>(["volume", sr("support"), sr("resistance")]);
}

export function layersForStrategy(
  family: StrategyFamily,
  id: string,
): Set<LayerKey> {
  switch (family) {
    case "rsi":
      return new Set<LayerKey>([aux("rsi")]);
    case "macd":
      return layersForMacd(id as MacdStrategyId);
    case "stoch":
      return layersForStoch(id as StochStrategyId);
    case "bb":
      return layersForBb(id as BbStrategyId);
    case "ichimoku":
      return new Set<LayerKey>(["ichimoku"]);
    case "volume":
      return layersForVolume(id as VolumeStrategyId);
    case "combo":
      return layersForCombo(id as ComboStrategyId);
    case "pattern":
      return layersForPattern();
    case "classic":
      return layersForClassic(id as ClassicStrategyId);
  }
}

export function isLayerVisible(key: LayerKey): boolean {
  if (key === "bb") {
    const vis = getBbOverlayVisibility();
    return BB_BAND_ORDER.some((band) => vis[band]);
  }
  if (key === "ichimoku") {
    const vis = getIchimokuOverlayVisibility();
    return ICHIMOKU_PART_ORDER.some((part) => vis[part]);
  }
  if (key === "volume") return isVolumeOverlayVisible();
  if (key.startsWith("aux:")) {
    return getAuxIndicatorVisibility()[key.slice(4) as AuxIndicatorId] ?? false;
  }
  if (key.startsWith("sr:")) {
    return getSrChartVisibility()[key.slice(3) as SrChartToggleId] ?? false;
  }
  if (key.startsWith("sma:")) {
    return isIndicatorOverlayVisible("sma", Number(key.slice(4)));
  }
  if (key.startsWith("ema:")) {
    return isIndicatorOverlayVisible("ema", Number(key.slice(4)));
  }
  return false;
}

export function setLayerVisible(key: LayerKey, visible: boolean): void {
  applyLayer(key, visible);
}

function applyLayer(key: LayerKey, visible: boolean): void {
  if (key === "bb") {
    setBbOverlayGroupVisible(visible);
    return;
  }
  if (key === "ichimoku") {
    setIchimokuOverlayGroupVisible(visible);
    return;
  }
  if (key === "volume") {
    setVolumeOverlayVisible(visible);
    return;
  }
  if (key.startsWith("aux:")) {
    setAuxIndicatorVisible(key.slice(4) as AuxIndicatorId, visible);
    return;
  }
  if (key.startsWith("sr:")) {
    setSrChartVisible(key.slice(3) as SrChartToggleId, visible);
    return;
  }
  if (key.startsWith("sma:")) {
    setIndicatorOverlayVisible("sma", Number(key.slice(4)), visible);
    return;
  }
  if (key.startsWith("ema:")) {
    setIndicatorOverlayVisible("ema", Number(key.slice(4)), visible);
  }
}

function layersForAllEnabledStrategies(): Set<LayerKey> {
  const out = new Set<LayerKey>();
  const addVisible = (
    family: StrategyFamily,
    visibility: Record<string, boolean>,
    order: readonly string[],
  ) => {
    for (const id of order) {
      if (!visibility[id]) continue;
      for (const key of layersForStrategy(family, id)) out.add(key);
    }
  };

  addVisible("bb", getBbStrategyVisibility(), BB_STRATEGY_ORDER);
  addVisible("ichimoku", getIchimokuStrategyVisibility(), ICHIMOKU_STRATEGY_ORDER);
  addVisible("volume", getVolumeStrategyVisibility(), VOLUME_STRATEGY_ORDER);
  addVisible("rsi", getRsiStrategyVisibility(), RSI_STRATEGY_ORDER);
  addVisible("macd", getMacdStrategyVisibility(), MACD_STRATEGY_ORDER);
  addVisible("stoch", getStochStrategyVisibility(), STOCH_STRATEGY_ORDER);
  addVisible("pattern", getPatternStrategyVisibility(), PATTERN_STRATEGY_ORDER);
  addVisible("combo", getComboStrategyVisibility(), COMBO_STRATEGY_ORDER);
  addVisible("classic", getClassicStrategyVisibility(), CLASSIC_STRATEGY_ORDER);
  return out;
}

/** Show chart layers needed to read this playbook. */
export function enableIndicatorsForStrategy(
  family: StrategyFamily,
  id: string,
): void {
  for (const key of layersForStrategy(family, id)) applyLayer(key, true);
  if (family === "volume" && id === "vwap_trendline") {
    setTrendlineChartVisible("ascending", true);
    setTrendlineChartVisible("descending", true);
  }
}

export function enableIndicatorsForStrategies(
  family: StrategyFamily,
  ids: readonly string[],
): void {
  for (const id of ids) enableIndicatorsForStrategy(family, id);
}

/**
 * Hide layers this playbook turned on, unless another still-enabled playbook needs them.
 * Call after the strategy visibility has already been saved as off.
 */
export function releaseIndicatorsForStrategy(
  family: StrategyFamily,
  id: string,
): void {
  releaseIndicatorsForStrategies(family, [id]);
}

export function releaseIndicatorsForStrategies(
  family: StrategyFamily,
  ids: readonly string[],
): void {
  const released = new Set<LayerKey>();
  for (const id of ids) {
    for (const key of layersForStrategy(family, id)) released.add(key);
  }
  if (released.size === 0) return;

  const stillNeeded = layersForAllEnabledStrategies();
  for (const key of released) {
    if (!stillNeeded.has(key)) applyLayer(key, false);
  }
}
