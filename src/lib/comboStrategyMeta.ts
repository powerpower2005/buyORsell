import type { AuxIndicatorId } from "./auxIndicatorStore";
import type { TrendLabel } from "./types";

/** Multi-indicator playbooks (Supertrend/ADX/CCI/ATR/VWAP/MFI/OBV/…). */
export type ComboStrategyId =
  | "st_adx"
  | "kc_cci"
  | "vwap_flow"
  | "pctb_mean_reversion"
  | "psar_adx"
  | "obv_div_st";

export const COMBO_STRATEGY_ORDER: ComboStrategyId[] = [
  "st_adx",
  "kc_cci",
  "vwap_flow",
  "pctb_mean_reversion",
  "psar_adx",
  "obv_div_st",
];

export const COMBO_STRATEGY_META: Record<
  ComboStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
    /** Aux panels where this playbook is also listed under 「전략」. */
    relatedAux: AuxIndicatorId[];
    /** Also list under volume → 전략. */
    showUnderVolume?: boolean;
    /** Also list under 볼린저 → 전략. */
    showUnderBb?: boolean;
  }
> = {
  st_adx: {
    label: "Supertrend + ADX",
    labelKo: "슈퍼트렌드+ADX",
    description:
      "추세가 강할 때(ADX 25 이상)만 슈퍼트렌드 전환을 따라갑니다. 횡보 잡음이 적고 추세·중장기 스윙에 잘 맞습니다.",
    markerBull: "SA↑",
    markerBear: "SA↓",
    typicalDirection: "neutral",
    relatedAux: ["supertrend", "adx", "atr"],
  },
  kc_cci: {
    label: "Keltner + CCI",
    labelKo: "켈트너+CCI",
    description:
      "켈트너 밴드를 넘고 CCI가 과열·과매도 구간(±100)이며 변동성(ATR)이 커질 때 돌파·모멘텀 매매에 씁니다.",
    markerBull: "KC↑",
    markerBear: "KC↓",
    typicalDirection: "neutral",
    relatedAux: ["keltner", "cci", "atr"],
    showUnderVolume: true,
  },
  vwap_flow: {
    label: "VWAP + MFI + OBV",
    labelKo: "VWAP자금흐름",
    description:
      "VWAP 지지·저항과 MFI 방향, OBV 신고·신저가 맞을 때 기관식 자금 흐름을 따라갑니다. 일·주·월봉·유동성 큰 종목에 유리합니다.",
    markerBull: "WF↑",
    markerBear: "WF↓",
    typicalDirection: "neutral",
    relatedAux: ["vwap", "mfi", "obv"],
    showUnderVolume: true,
  },
  pctb_mean_reversion: {
    label: "%B + CCI + ATR",
    labelKo: "%B평균회귀",
    description:
      "볼린저 밴드 밖으로 너무 나갔을 때(%B)와 CCI 과열·과매도에서 되돌림을 노립니다. 변동성 급등·강한 추세장은 피하고 횡보·박스장에 맞습니다.",
    markerBull: "MR↑",
    markerBear: "MR↓",
    typicalDirection: "neutral",
    relatedAux: ["bbPercentB", "cci", "atr"],
    showUnderBb: true,
  },
  psar_adx: {
    label: "PSAR + ADX + ATR",
    labelKo: "PSAR+ADX",
    description:
      "추세가 있을 때(ADX 20 이상) 파라볼릭 SAR 전환으로 방향 전환을 빨리 잡습니다. ATR로 손절·추적하는 방식과 잘 맞습니다.",
    markerBull: "PA↑",
    markerBear: "PA↓",
    typicalDirection: "neutral",
    relatedAux: ["psar", "adx", "atr"],
  },
  obv_div_st: {
    label: "OBV div + Supertrend",
    labelKo: "OBV다이버전스+ST",
    description:
      "주가와 OBV가 어긋난 뒤 슈퍼트렌드가 바뀌면 반전 확인으로 봅니다. MFI까지 맞으면 더 신뢰합니다. 추세 끝·반전 포착용입니다.",
    markerBull: "OS↑",
    markerBear: "OS↓",
    typicalDirection: "neutral",
    relatedAux: ["obv", "supertrend", "mfi"],
    showUnderVolume: true,
  },
};

/** Aux ids that host nested 「전략」 under 보조 지표. */
export const AUX_WITH_COMBO_STRATEGIES = [
  "mfi",
  "atr",
  "obv",
  "keltner",
  "vwap",
  "forever_vwap",
  "adx",
  "psar",
  "cci",
  "supertrend",
  "bbPercentB",
] as const;

export type AuxWithComboStrategies = (typeof AUX_WITH_COMBO_STRATEGIES)[number];

export function isAuxWithComboStrategies(
  id: AuxIndicatorId,
): id is AuxWithComboStrategies {
  return (AUX_WITH_COMBO_STRATEGIES as readonly string[]).includes(id);
}

export function comboStrategiesForAux(
  auxId: AuxIndicatorId,
): ComboStrategyId[] {
  return COMBO_STRATEGY_ORDER.filter((id) =>
    COMBO_STRATEGY_META[id].relatedAux.includes(auxId),
  );
}

export function comboStrategiesForVolume(): ComboStrategyId[] {
  return COMBO_STRATEGY_ORDER.filter(
    (id) => COMBO_STRATEGY_META[id].showUnderVolume,
  );
}

export function comboStrategiesForBb(): ComboStrategyId[] {
  return COMBO_STRATEGY_ORDER.filter(
    (id) => COMBO_STRATEGY_META[id].showUnderBb,
  );
}

export function comboStrategyMarkerText(
  id: ComboStrategyId,
  direction: TrendLabel,
): string {
  const meta = COMBO_STRATEGY_META[id];
  if (direction === "bearish") return meta.markerBear;
  return meta.markerBull;
}
