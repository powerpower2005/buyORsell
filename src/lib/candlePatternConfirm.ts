/**
 * Companion layers for candle patterns.
 * Detection stays shape-only; confidence comes from turning these on and reading context.
 */

import { setAuxIndicatorVisible, type AuxIndicatorId } from "./auxIndicatorStore";
import type { CandlePatternId } from "./evaluation/candlePatterns";
import {
  setIndicatorOverlayVisible,
  setVolumeOverlayVisible,
} from "./indicatorOverlayStore";
import { setSrChartVisible, type SrChartToggleId } from "./srZoneStore";

export type CandleConfirmLayer =
  | { kind: "volume"; label: string }
  | { kind: "aux"; id: AuxIndicatorId; label: string }
  | { kind: "sr"; id: SrChartToggleId; label: string }
  | { kind: "sma"; period: number; label: string }
  | { kind: "ema"; period: number; label: string };

const VOL: CandleConfirmLayer = { kind: "volume", label: "거래량" };
const RSI: CandleConfirmLayer = { kind: "aux", id: "rsi", label: "RSI" };
const MACD: CandleConfirmLayer = { kind: "aux", id: "macd", label: "MACD" };
const ADX: CandleConfirmLayer = { kind: "aux", id: "adx", label: "ADX" };
const VWAP: CandleConfirmLayer = { kind: "aux", id: "vwap", label: "VWAP" };
const SUP: CandleConfirmLayer = { kind: "sr", id: "support", label: "지지" };
const RES: CandleConfirmLayer = {
  kind: "sr",
  id: "resistance",
  label: "저항",
};
const SMA20: CandleConfirmLayer = { kind: "sma", period: 20, label: "SMA20" };

/** Reversal candidates — location + momentum matter more than the candle alone. */
const REVERSAL_BULL: CandleConfirmLayer[] = [VOL, SUP, RSI, VWAP];
const REVERSAL_BEAR: CandleConfirmLayer[] = [VOL, RES, RSI, VWAP];
/** Continuation / thrust — trend strength + participation. */
const CONTINUATION_BULL: CandleConfirmLayer[] = [VOL, ADX, MACD, SMA20];
const CONTINUATION_BEAR: CandleConfirmLayer[] = [VOL, ADX, MACD, SMA20];
/** Uncertainty — wait for next direction with S/R + oscillators. */
const UNCERTAIN: CandleConfirmLayer[] = [VOL, SUP, RES, RSI];

export const CANDLE_PATTERN_CONFIRM: Record<
  CandlePatternId,
  CandleConfirmLayer[]
> = {
  hammer: REVERSAL_BULL,
  inverted_hammer: REVERSAL_BULL,
  bullish_engulfing: REVERSAL_BULL,
  bullish_harami: REVERSAL_BULL,
  morning_star: REVERSAL_BULL,
  piercing: REVERSAL_BULL,
  tweezers_bottom: REVERSAL_BULL,
  bullish_marubozu: CONTINUATION_BULL,
  rising_three_methods: CONTINUATION_BULL,
  three_white_soldiers: CONTINUATION_BULL,

  hanging_man: REVERSAL_BEAR,
  shooting_star: REVERSAL_BEAR,
  bearish_engulfing: REVERSAL_BEAR,
  bearish_harami: REVERSAL_BEAR,
  evening_star: REVERSAL_BEAR,
  dark_cloud_cover: REVERSAL_BEAR,
  tweezers_top: REVERSAL_BEAR,
  bearish_marubozu: CONTINUATION_BEAR,
  falling_three_methods: CONTINUATION_BEAR,
  three_black_crows: CONTINUATION_BEAR,

  doji: UNCERTAIN,
  spinning_top: UNCERTAIN,
};

export function confirmLayersFor(
  id: CandlePatternId,
): CandleConfirmLayer[] {
  return CANDLE_PATTERN_CONFIRM[id];
}

export function confirmWorksWithText(id: CandlePatternId): string {
  const labels = confirmLayersFor(id).map((l) => l.label).join(" · ");
  return `${labels}. 패턴은 형태만 느슨히 잡고, 위 레이어로 위치·수급·모멘텀을 확인하세요.`;
}

export function enableCandleConfirmLayer(layer: CandleConfirmLayer): void {
  switch (layer.kind) {
    case "volume":
      setVolumeOverlayVisible(true);
      return;
    case "aux":
      setAuxIndicatorVisible(layer.id, true);
      return;
    case "sr":
      setSrChartVisible(layer.id, true);
      return;
    case "sma":
      setIndicatorOverlayVisible("sma", layer.period, true);
      return;
    case "ema":
      setIndicatorOverlayVisible("ema", layer.period, true);
      return;
  }
}

export function enableAllCandleConfirmLayers(id: CandlePatternId): void {
  for (const layer of confirmLayersFor(id)) {
    enableCandleConfirmLayer(layer);
  }
}
