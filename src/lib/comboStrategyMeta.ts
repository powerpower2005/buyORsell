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
      "ADX>25 강한 추세에서만 슈퍼트렌드 전환을 따라감. 횡보 노이즈가 적음. 추세장·중장기 스윙에 적합.",
    markerBull: "SA↑",
    markerBear: "SA↓",
    typicalDirection: "neutral",
    relatedAux: ["supertrend", "adx", "atr"],
  },
  kc_cci: {
    label: "Keltner + CCI",
    labelKo: "켈트너+CCI",
    description:
      "켈트너 돌파 + CCI ±100 + ATR 확대 필터. 변동성 확대 국면의 돌파·모멘텀 매매에 적합.",
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
      "VWAP 지지/저항 + MFI 방향 + OBV 신고·신저로 기관식 자금 흐름을 따라감. 일·주·월·유동성 큰 종목에 유리.",
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
      "밴드 밖 과열(%B)·CCI ±100에서 되돌림. ATR 급등·ADX 강한 추세장은 피함. 박스·횡보에 적합.",
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
      "ADX>20에서 파라볼릭 SAR 플립으로 추세 전환을 빠르게 포착. ATR 트레일 개념과 잘 맞음.",
    markerBull: "PA↑",
    markerBear: "PA↓",
    typicalDirection: "neutral",
    relatedAux: ["psar", "adx", "atr"],
  },
  obv_div_st: {
    label: "OBV div + Supertrend",
    labelKo: "OBV다이버전스+ST",
    description:
      "가격·OBV 다이버전스 후 슈퍼트렌드 전환으로 반전 확인. MFI 동반 시 신뢰↑. 추세 끝·반전 포착용.",
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
