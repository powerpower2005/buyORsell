import type { TrendLabel } from "./types";

/** Trading playbooks layered on classical chart-pattern detections. */
export type PatternStrategyId =
  | "breakout_entry"
  | "breakout_confirm_entry"
  | "retest_entry"
  | "volume_breakout"
  | "triple_confirm"
  | "fake_breakout"
  | "trap_entry";

export const PATTERN_STRATEGY_ORDER: PatternStrategyId[] = [
  "breakout_entry",
  "breakout_confirm_entry",
  "retest_entry",
  "volume_breakout",
  "triple_confirm",
  "fake_breakout",
  "trap_entry",
];

export const PATTERN_STRATEGY_META: Record<
  PatternStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  breakout_entry: {
    label: "Neckline / level breakout",
    labelKo: "목선·레벨 돌파 진입",
    description:
      "패턴 목선·저항·지지를 종가로 뚫은 그 봉에서 바로 들어갑니다. 공격적인 진입입니다.",
    markerBull: "BE↑",
    markerBear: "BE↓",
    typicalDirection: "neutral",
  },
  breakout_confirm_entry: {
    label: "Breakout + next-bar confirm",
    labelKo: "돌파 다음 봉 확인 진입",
    description:
      "돌파 종가 다음 봉이 같은 방향으로 확인(양·음봉·레벨 유지)될 때 진입합니다. 돌파 봉에서는 들어가지 않습니다.",
    markerBull: "BC↑",
    markerBear: "BC↓",
    typicalDirection: "neutral",
  },
  retest_entry: {
    label: "Retest entry",
    labelKo: "리테스트 안전 진입",
    description:
      "돌파 뒤 가격이 되돌아와 레벨을 다시 확인하고, 확인 봉이 나올 때 진입합니다. 비교적 안정적입니다.",
    markerBull: "RT↑",
    markerBear: "RT↓",
    typicalDirection: "neutral",
  },
  volume_breakout: {
    label: "Volume-confirmed breakout",
    labelKo: "거래량 확인 돌파",
    description:
      "돌파 봉 거래량이 최근 평균보다 클 때만 신호를 냅니다. 가짜 돌파를 줄이는 필터입니다.",
    markerBull: "VB↑",
    markerBear: "VB↓",
    typicalDirection: "neutral",
  },
  triple_confirm: {
    label: "Triple confirmation",
    labelKo: "삼중 확인 진입",
    description:
      "종가 돌파, 거래량 증가, 리테스트 확인이 모두 맞는 봉에서만 진입합니다. 가짜 돌파를 가장 강하게 걸러냅니다.",
    markerBull: "3C↑",
    markerBear: "3C↓",
    typicalDirection: "neutral",
  },
  fake_breakout: {
    label: "Fake / failed breakout",
    labelKo: "가짜 돌파·이탈 경고",
    description:
      "돌파 후 종가가 다시 안으로 들어오거나(실패), 꼬리만 뚫고 종가는 회복(스탑 헌팅)하면 경고만 냅니다. 진입·손익 계획은 없고, 반대 진입은 trap_entry를 씁니다.",
    markerBull: "FK↑",
    markerBear: "FK↓",
    typicalDirection: "neutral",
  },
  trap_entry: {
    label: "Trap / failed-breakout entry",
    labelKo: "트랩(가짜 돌파) 진입",
    description:
      "돌파가 종가 기준으로 실패하면 반대 방향으로 공격 진입합니다. 손절은 실패 스윙 밖(+여유), 목표는 패턴 측정폭의 약 1.35배입니다. 깃발·삼각형 등에 씁니다.",
    markerBull: "TR↑",
    markerBear: "TR↓",
    typicalDirection: "neutral",
  },
};

export function patternStrategyMarkerText(
  id: PatternStrategyId,
  direction: TrendLabel,
): string {
  const meta = PATTERN_STRATEGY_META[id];
  return direction === "bearish" ? meta.markerBear : meta.markerBull;
}
