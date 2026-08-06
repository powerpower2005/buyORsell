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
      "패턴 목선·저항·지지를 종가로 돌파한 봉에서 바로 진입. 공격적 진입.",
    markerBull: "BE↑",
    markerBear: "BE↓",
    typicalDirection: "neutral",
  },
  breakout_confirm_entry: {
    label: "Breakout + next-bar confirm",
    labelKo: "돌파 다음 봉 확인 진입",
    description:
      "돌파 종가 다음 봉이 같은 방향으로 확인(양/음봉·레벨 유지)될 때 진입. 돌파 봉 자체에는 진입하지 않음(커리큘럼).",
    markerBull: "BC↑",
    markerBear: "BC↓",
    typicalDirection: "neutral",
  },
  retest_entry: {
    label: "Retest entry",
    labelKo: "리테스트 안전 진입",
    description:
      "돌파 후 되돌림으로 레벨을 재테스트하고 확인 봉이 나올 때 진입. 안정적.",
    markerBull: "RT↑",
    markerBear: "RT↓",
    typicalDirection: "neutral",
  },
  volume_breakout: {
    label: "Volume-confirmed breakout",
    labelKo: "거래량 확인 돌파",
    description:
      "돌파 봉 거래량이 최근 평균보다 클 때만 신호. 가짜 돌파를 줄이는 필터.",
    markerBull: "VB↑",
    markerBear: "VB↓",
    typicalDirection: "neutral",
  },
  triple_confirm: {
    label: "Triple confirmation",
    labelKo: "삼중 확인 진입",
    description:
      "종가 돌파 + 거래량 증가 + 리테스트 확인이 모두 갖춰진 봉에서만 진입. 가짜 돌파를 가장 강하게 걸러냄.",
    markerBull: "3C↑",
    markerBear: "3C↓",
    typicalDirection: "neutral",
  },
  fake_breakout: {
    label: "Fake / failed breakout",
    labelKo: "가짜 돌파·이탈 경고",
    description:
      "돌파 후 종가 재관통(실패) 또는 윅만 뚫고 종가 회복(스탑 헌팅). 경고 전용(RR 계획 없음). 트랩 진입은 trap_entry.",
    markerBull: "FK↑",
    markerBear: "FK↓",
    typicalDirection: "neutral",
  },
  trap_entry: {
    label: "Trap / failed-breakout entry",
    labelKo: "트랩(가짜 돌파) 진입",
    description:
      "종가 재관통 실패 시 반대 방향 공격 진입. 손절=실패 스윙 밖(+버퍼) · 목표≈패턴 측정이동 ×1.35(공황 확장). 깃발·삼각형 포함.",
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
