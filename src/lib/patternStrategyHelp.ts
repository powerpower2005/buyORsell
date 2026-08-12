import type { HelpContent } from "./indicatorHelp";
import type { PatternStrategyId } from "./patternStrategyMeta";
import { PATTERN_STRATEGY_META } from "./patternStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const PATTERN_STRATEGY_HELP: Record<PatternStrategyId, HelpContent> = {
  breakout_entry: {
    title: "목선·레벨 돌파 진입",
    summary: PATTERN_STRATEGY_META.breakout_entry.description,
    howToFind:
      "차트 패턴이 완성되는 날 = 목선(저항/지지)을 종가로 뚫은 날입니다. 그 봉에 바로 진입 신호가 뜹니다. 가짜 돌파가 많으니 «다음 봉 확인»·«거래량 확인»을 같이 켜 두는 편이 안전합니다.",
    ...BREAK,
    higher: "상승 패턴이 완성된 봉에서 매수 후보.",
    lower: "하락 패턴이 완성된 봉에서 매도 후보. 가짜 돌파·스탑 헌팅에 취약할 수 있습니다.",
    worksWith: "돌파 다음 봉 확인, 거래량 확인 돌파, 리테스트, 가짜 돌파 경고, RSI·MACD, 망치/잉걸핑.",
    pros: "패턴 완성 즉시 들어가 추세를 일찍 탑니다. 목표가(패턴 높이)와 연결하기 쉽습니다.",
    cons: "첫 돌파라 휩쏘에 취약합니다. 거래량 없는 돌파는 가짜일 수 있습니다.",
    tip: "공격적 진입입니다. 돌파 봉에 바로 사지 말고 «돌파 다음 봉 확인»을 우선해 보세요.",
  },
  breakout_confirm_entry: {
    title: "돌파 다음 봉 확인 진입",
    summary: PATTERN_STRATEGY_META.breakout_confirm_entry.description,
    howToFind:
      "패턴이 종가로 돌파된 **다음 봉**이 같은 방향인지 봅니다. 매수: 양봉·레벨 위 유지 / 매도: 음봉·레벨 아래 유지. 돌파한 그날에는 신호가 없습니다.",
    ...BREAK,
    higher: "상승 돌파 다음 봉이 양봉이고 레벨 위에서 버티면 매수.",
    lower: "하락 돌파 다음 봉이 음봉이고 레벨 아래를 유지하면 매도.",
    worksWith: "거래량 확인 돌파 · 리테스트 · 삼중 확인 · RSI · MACD · 가짜 돌파 경고.",
    pros: "돌파 봉 휩쏘를 한 봉 걸러 가짜 돌파를 줄입니다.",
    cons: "한 봉 늦게 들어가 추격·놓침이 생길 수 있습니다.",
    tip: "돌파 봉에 바로 사지 마세요. 다음 봉이 반대로 닫히면 이 전략 신호는 없습니다.",
  },
  retest_entry: {
    title: "리테스트 안전 진입",
    summary: PATTERN_STRATEGY_META.retest_entry.description,
    howToFind:
      "돌파 후 며칠 안에 가격이 돌파했던 레벨 근처로 되돌아와, 지지(또는 저항)로 버티는 양봉/음봉이 나오면 진입합니다. 직사각형·삼각형에서 가짜 돌파를 줄이는 데 유리합니다.",
    ...BREAK,
    higher: "돌파 후 눌림→레벨 지지+양봉 확인 시 매수. 망치·상승 잉걸핑이면 더 좋습니다.",
    lower: "돌파 후 반등→레벨 저항+음봉 확인 시 매도. 유성·하락 잉걸핑이면 더 좋습니다.",
    worksWith: "망치/잉걸핑 · 거래량 · RSI · MACD · 가짜 돌파 경고 · 지지·저항.",
    pros: "역할 전환을 확인한 뒤라 가짜 돌파를 줄입니다. 손절(레벨 재이탈)이 명확합니다.",
    cons: "확인을 기다려 늦거나 놓치는 움직임이 큽니다. 리테스트 없이 달리면 신호 없음.",
    tip: "성급한 돌파보다 안정적입니다. 시가만 보지 말고 종가·리테스트를 우선하세요.",
  },
  volume_breakout: {
    title: "거래량 확인 돌파",
    summary: PATTERN_STRATEGY_META.volume_breakout.description,
    howToFind:
      "패턴 돌파 봉의 거래량이 최근 약 20봉 평균의 1.35배 이상일 때만 신호가 납니다. 참여가 큰 돌파만 남기려는 필터입니다.",
    ...BREAK,
    higher: "거래량 동반 상향 돌파 → 매수 신뢰↑.",
    lower: "거래량 동반 하향 이탈 → 매도 신뢰↑. 평균 이하면 이 전략 신호 없음.",
    worksWith: "돌파·리테스트·삼중 확인, RSI·MACD, OBV, 스윙.",
    pros: "허위 돌파를 줄이는 필터입니다.",
    cons: "거래량만으로는 방향이 안 나옵니다. 저유동 종목에서는 신호가 드뭅니다.",
    tip: "1차=가격(패턴), 2차=거래량으로 보세요.",
  },
  triple_confirm: {
    title: "삼중 확인 진입",
    summary: PATTERN_STRATEGY_META.triple_confirm.description,
    howToFind:
      "① 목선·레벨 종가 돌파 ② 돌파 봉 거래량이 최근 평균보다 큼 ③ 이후 리테스트에서 확인 양봉/음봉 — 세 조건이 모두 갖춰진 리테스트 봉에만 신호가 납니다.",
    ...BREAK,
    higher: "상향 돌파+거래량 후, 레벨 지지 리테스트·양봉 확인 시 매수.",
    lower: "하향 이탈+거래량 후, 레벨 저항 리테스트·음봉 확인 시 매도.",
    worksWith: "클래식 차트 패턴 · RSI · MACD · 망치/잉걸핑 · 가짜 돌파 경고.",
    pros: "종가·거래량·리테스트로 가짜 돌파에 가장 강합니다.",
    cons: "조건이 많아 신호가 드물고 후행합니다.",
    tip: "패턴 정확도 %만 믿지 말고, 이 세 확인을 실전 필터로 보세요.",
  },
  fake_breakout: {
    title: "가짜 돌파 · 가짜 이탈 경고",
    summary: PATTERN_STRATEGY_META.fake_breakout.description,
    howToFind:
      "돌파 후 약 15봉 안을 봅니다. (1) 종가가 다시 레벨 안으로 돌아오면 실패 → 반대 방향 경고. (2) 꼬리만 레벨을 뚫고 종가는 회복하면 스탑 헌팅형 → 원래 돌파 방향 유지·회복 신호.",
    ...BREAK,
    higher:
      "하락 돌파 실패(종가 재상향) → 매수 경고. 또는 상승 돌파 후 지지 꼬리 이탈·종가 회복 → 매수 쪽 회복 신호.",
    lower:
      "상승 돌파 실패(종가 재하향) → 매도 경고. 또는 하락 돌파 후 저항 꼬리·종가 회복 → 매도 쪽 회복 신호.",
    worksWith: "트랩 진입 · 망치/잉걸핑 · 거래량 · RSI · MACD · 돌파·리테스트.",
    pros: "실패·헌팅을 규칙으로 표시해 ‘모양만 보고 버티기’를 막습니다.",
    cons: "짧은 휩쏘도 잡힐 수 있고, 실패 후 재돌파는 다시 판단해야 합니다.",
    tip: "경고 전용입니다. 반대 방향 진입·확장 목표는 «트랩 진입»을 보세요.",
  },
  trap_entry: {
    title: "트랩(가짜 돌파) 진입",
    summary: PATTERN_STRATEGY_META.trap_entry.description,
    howToFind:
      "확정 패턴 돌파 후 종가가 레벨을 다시 뚫고 돌아오면(실패) 그 봉에서 반대 방향 진입 신호·손익비가 생깁니다. 꼬리만 뚫고 종가가 회복한 경우는 트랩이 아니라 가짜 돌파 경고의 회복 신호입니다.",
    ...BREAK,
    higher:
      "하락 돌파 실패(종가 재상향) → 매수 트랩. 손절=실패 저점 아래. 목표≈패턴 높이×1.35.",
    lower:
      "상승 돌파 실패(종가 재하향) → 매도 트랩. 손절=실패 고점 위. 목표≈패턴 높이×1.35.",
    worksWith: "가짜 돌파 경고 · 망치/잉걸핑 · 거래량 · RSI · MACD.",
    pros: "실패를 기회로 전환. 일반 돌파 목표가보다 크게 잡을 수 있습니다.",
    cons: "공격적입니다. 재돌파·이중 실패면 손절이 빠릅니다. 포지션은 작게.",
    tip: "진입은 패턴 실패 규칙, 청산은 가격 움직임·손익비를 우선하세요.",
  },
};

export function patternStrategyHelp(id: PatternStrategyId): HelpContent {
  return PATTERN_STRATEGY_HELP[id];
}
