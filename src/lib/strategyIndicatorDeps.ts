/**
 * When a playbook is turned on, show its related chart layers.
 * Turning indicators off later stays independent (does not force strategies off).
 */

import { setAuxIndicatorVisible, type AuxIndicatorId } from "./auxIndicatorStore";
import {
  COMBO_STRATEGY_META,
  type ComboStrategyId,
} from "./comboStrategyMeta";
import {
  setBbOverlayGroupVisible,
  setIchimokuOverlayGroupVisible,
  setIndicatorOverlayVisible,
  setVolumeOverlayVisible,
} from "./indicatorOverlayStore";
import type { BbStrategyId } from "./bbStrategyMeta";
import type { MacdStrategyId } from "./macdStrategyMeta";
import type { StochStrategyId } from "./stochStrategyMeta";
import type { VolumeStrategyId } from "./volumeStrategyMeta";
import type { ClassicStrategyId } from "./classicStrategyMeta";

/** Keep local to avoid import cycles with strategyCatalog ↔ stores. */
type StrategyFamily =
  | "bb"
  | "ichimoku"
  | "volume"
  | "rsi"
  | "macd"
  | "stoch"
  | "pattern"
  | "combo"
  | "classic";

function showAux(...ids: AuxIndicatorId[]): void {
  for (const id of ids) setAuxIndicatorVisible(id, true);
}

function enableBbLayers(): void {
  setBbOverlayGroupVisible(true);
}

function enableIchimokuLayers(): void {
  setIchimokuOverlayGroupVisible(true);
}

function enableVolumePanel(): void {
  setVolumeOverlayVisible(true);
}

function enableSma(period: number): void {
  setIndicatorOverlayVisible("sma", period, true);
}

function enableEma(period: number): void {
  setIndicatorOverlayVisible("ema", period, true);
}

function enableCombo(id: ComboStrategyId): void {
  const meta = COMBO_STRATEGY_META[id];
  showAux(...meta.relatedAux);
  if (meta.showUnderVolume) enableVolumePanel();
  if (meta.showUnderBb) enableBbLayers();
}

function enableBb(id: BbStrategyId): void {
  enableBbLayers();
  switch (id) {
    case "trend_follow":
      showAux("bbPercentB", "mfi");
      break;
    case "divergence":
      showAux("rsi");
      break;
    default:
      break;
  }
}

function enableMacd(id: MacdStrategyId): void {
  showAux("macd");
  if (id === "macd_rsi_confirm") showAux("rsi");
}

function enableStoch(id: StochStrategyId): void {
  showAux("stoch");
  if (id === "stoch_ma20_cross") enableSma(20);
}

function enableClassic(id: ClassicStrategyId): void {
  switch (id) {
    case "ma_golden_dead":
      enableSma(20);
      enableSma(50);
      break;
    case "fib_wave_pullback":
    case "gann_zone":
      break;
  }
}

function enableVolume(id: VolumeStrategyId): void {
  enableVolumePanel();
  switch (id) {
    case "heatmap_volume":
    case "volume_fight":
    case "vsa":
      showAux("psar");
      enableEma(60);
      break;
    case "vwap_pullback":
    case "vwap_band_reversal":
    case "vwap_switching":
      showAux("vwap");
      break;
    case "obv_divergence":
    case "obv_fast_thrust":
      showAux("obv");
      break;
    case "obv_keltner":
      showAux("obv", "keltner");
      break;
  }
}

/** Show chart layers needed to read this playbook. No-op when turning off. */
export function enableIndicatorsForStrategy(
  family: StrategyFamily,
  id: string,
): void {
  switch (family) {
    case "rsi":
      showAux("rsi");
      break;
    case "macd":
      enableMacd(id as MacdStrategyId);
      break;
    case "stoch":
      enableStoch(id as StochStrategyId);
      break;
    case "bb":
      enableBb(id as BbStrategyId);
      break;
    case "ichimoku":
      enableIchimokuLayers();
      break;
    case "volume":
      enableVolume(id as VolumeStrategyId);
      break;
    case "combo":
      enableCombo(id as ComboStrategyId);
      break;
    case "pattern":
      break;
    case "classic":
      enableClassic(id as ClassicStrategyId);
      break;
  }
}

export function enableIndicatorsForStrategies(
  family: StrategyFamily,
  ids: readonly string[],
): void {
  for (const id of ids) enableIndicatorsForStrategy(family, id);
}
