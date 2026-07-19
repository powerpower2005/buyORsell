import type { HelpContent } from "./indicatorHelp";
import type { PatternStrategyId } from "./patternStrategyMeta";
import { PATTERN_STRATEGY_META } from "./patternStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const PATTERN_STRATEGY_HELP: Record<PatternStrategyId, HelpContent> = {
  breakout_entry: {
    title: "목선·레벨 돌파 진입",
    summary: PATTERN_STRATEGY_META.breakout_entry.description,
    howToFind:
      "차트 패턴이 ‘완성(confirmed)’으로 잡힌 봉 = 목선·저항·지지 종가 돌파 봉입니다. 이 전략은 그 완성 봉에 바로 진입 마커를 올립니다.",
    ...BREAK,
    higher: "롱 패턴 완성 봉에서 매수 진입 후보.",
    lower: "숏 패턴 완성 봉에서 매도/숏 진입 후보. 가짜 돌파에 취약할 수 있음.",
    tip: "공격적 진입입니다. 불확실하면 리테스트·거래량 전략을 함께 보세요.",
  },
  retest_entry: {
    title: "리테스트 안전 진입",
    summary: PATTERN_STRATEGY_META.retest_entry.description,
    howToFind:
      "패턴 돌파 이후 수 봉 안에 가격이 돌파 레벨 근처로 되돌아와(리테스트) 확인 양봉/음봉이 나오는 봉을 찾습니다. 앱이 그 확인 봉에 마커를 표시합니다.",
    ...BREAK,
    higher: "롱: 돌파 후 눌림→레벨 지지+양봉 확인 시 진입.",
    lower: "숏: 돌파 후 반등→레벨 저항+음봉 확인 시 진입. 리테스트 실패(레벨 재이탈)면 무효.",
    tip: "성급한 돌파 진입보다 안정적입니다.",
  },
  volume_breakout: {
    title: "거래량 확인 돌파",
    summary: PATTERN_STRATEGY_META.volume_breakout.description,
    howToFind:
      "패턴 완성(돌파) 봉의 거래량이 직전 약 20봉 평균의 1.35배 이상일 때만 신호가 납니다. 거래량 없는 돌파는 제외됩니다.",
    ...BREAK,
    higher: "거래량 동반 상향 돌파 → 롱 신뢰↑.",
    lower: "거래량 동반 하향 이탈 → 숏 신뢰↑. 평균 이하면 이 전략 마커 없음.",
    tip: "가짜 돌파를 줄이는 필터입니다. 돌파 진입과 함께 쓰면 좋습니다.",
  },
};

export function patternStrategyHelp(id: PatternStrategyId): HelpContent {
  return PATTERN_STRATEGY_HELP[id];
}
