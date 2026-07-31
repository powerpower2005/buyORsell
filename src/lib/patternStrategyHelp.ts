import type { HelpContent } from "./indicatorHelp";
import type { PatternStrategyId } from "./patternStrategyMeta";
import { PATTERN_STRATEGY_META } from "./patternStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const PATTERN_STRATEGY_HELP: Record<PatternStrategyId, HelpContent> = {
  breakout_entry: {
    title: "목선·레벨 돌파 진입",
    summary: PATTERN_STRATEGY_META.breakout_entry.description,
    howToFind:
      "차트 패턴이 ‘완성’으로 잡힌 봉 = 목선·저항·지지 종가 돌파 봉입니다. 이 전략은 그 완성 봉에 바로 진입 마커를 올립니다. 다우·갠의 ‘추세 전환 첫 확인(a)’·엘리어트 돌파 감각에 가깝습니다.",
    ...BREAK,
    higher: "롱 패턴 완성 봉에서 매수 진입 후보.",
    lower: "숏 패턴 완성 봉에서 매도/숏 진입 후보. 가짜 돌파에 취약할 수 있음.",
    worksWith:
      "거래량 확인 돌파(다우식 2차 확인), 리테스트(갠: 돌파 저항→지지), 스윙 HH/HL.",
    pros:
      "패턴 완성 즉시 들어가 추세를 일찍 탑니다. 목표가(패턴 높이)와 연결하기 쉽고, 시장을 가리지 않습니다.",
    cons:
      "후행·주관성이 큰 패턴 분석의 약점이 그대로입니다. 거래량 없는 돌파·가짜 돌파에 취약하고, 엘리어트처럼 해석이 갈릴 수 있습니다. a시점(첫 돌파)이라 휩쏘가 많습니다.",
    tip: "공격적 진입입니다. 불확실하면 리테스트·거래량·삼중 확인 전략을 함께 보세요.",
  },
  retest_entry: {
    title: "리테스트 안전 진입",
    summary: PATTERN_STRATEGY_META.retest_entry.description,
    howToFind:
      "패턴 돌파 이후 수 봉 안에 가격이 돌파 레벨 근처로 되돌아와(리테스트) 확인 양봉/음봉이 나오는 봉을 찾습니다. 갠의 ‘붕괴된 저항→지지, 지지→저항’ 역할 전환 확인에 해당합니다.",
    ...BREAK,
    higher: "롱: 돌파 후 눌림→레벨 지지+양봉 확인 시 진입.",
    lower: "숏: 돌파 후 반등→레벨 저항+음봉 확인 시 진입. 리테스트 실패(레벨 재이탈)면 무효.",
    worksWith:
      "지지·저항 존, 피보 되돌림(엘리어트 2·4파 감각), 거래량.",
    pros:
      "돌파 직후보다 역할 전환을 확인한 뒤라 가짜 돌파를 줄입니다. 다우 전환 확정(b)에 가깝고 손절(레벨 재이탈)이 명확합니다.",
    cons:
      "확인을 기다려 후행·놓치는 움직임이 큽니다. 리테스트가 안 오고 그냥 달리는 강한 3파식 구간에서는 신호가 없습니다.",
    tip: "성급한 돌파 진입보다 안정적입니다.",
  },
  volume_breakout: {
    title: "거래량 확인 돌파",
    summary: PATTERN_STRATEGY_META.volume_breakout.description,
    howToFind:
      "패턴 완성(돌파) 봉의 거래량이 직전 약 20봉 평균의 1.35배 이상일 때만 신호가 납니다. 다우이론: 추세 방향 움직임은 거래량이 뒷받침되어야 신뢰↑(거래량은 2차 정보).",
    ...BREAK,
    higher: "거래량 동반 상향 돌파 → 롱 신뢰↑.",
    lower: "거래량 동반 하향 이탈 → 숏 신뢰↑. 평균 이하면 이 전략 마커 없음.",
    worksWith:
      "돌파 진입·리테스트·삼중 확인, 스윙 구조, OBV. 1차는 가격(패턴), 2차가 거래량입니다.",
    pros:
      "다우식 ‘거래량 확인’을 규칙으로 고정해 허위 돌파를 줄입니다. 엘리어트 3·C파처럼 참여가 큰 구간과 잘 맞습니다.",
    cons:
      "거래량 기준·해석이 주관적이고, 거래량만으로는 방향이 안 나옵니다. 확인을 기다릴수록 후행하며, 저유동 종목에서는 신호가 드뭅니다.",
    tip: "가짜 돌파를 줄이는 필터입니다. 돌파 진입과 함께 쓰면 좋습니다.",
  },
  triple_confirm: {
    title: "삼중 확인 진입",
    summary: PATTERN_STRATEGY_META.triple_confirm.description,
    howToFind:
      "① 패턴 목선·레벨 종가 돌파 ② 돌파 봉 거래량 ≥ 최근 20봉 평균 ×1.35 ③ 이후 리테스트에서 확인 양봉/음봉 — 세 조건이 모두 갖춰진 리테스트 봉에만 마커가 생깁니다.",
    ...BREAK,
    higher: "롱: 종가 상향 돌파+거래량 후, 레벨 지지 리테스트·양봉 확인 시 진입.",
    lower: "숏: 종가 하향 이탈+거래량 후, 레벨 저항 리테스트·음봉 확인 시 진입.",
    worksWith: "모든 클래식 차트 패턴. 가짜 돌파 경고와 함께 보면 실패 케이스를 걸러내기 쉽습니다.",
    pros:
      "‘종가·거래량·리테스트’ 원칙을 한 전략으로 고정해 불필요한 손실을 줄입니다. 가짜 돌파에 가장 강합니다.",
    cons:
      "조건이 많아 신호가 드물고 후행합니다. 강하게 달리는 구간에서는 리테스트가 안 와 신호가 없을 수 있습니다.",
    tip: "패턴은 실패할 수 있습니다. 공격적 돌파 진입보다 안전할 때 이 전략을 우선하세요.",
  },
  fake_breakout: {
    title: "가짜 돌파 경고",
    summary: PATTERN_STRATEGY_META.fake_breakout.description,
    howToFind:
      "패턴이 종가 돌파로 완성된 뒤 약 15봉 안에, 돌파했던 목선·레벨을 다시 종가로 관통하면 실패·가짜 돌파입니다. 마커 방향은 재관통 쪽(실패 후 가격이 간 방향)입니다.",
    ...BREAK,
    higher:
      "숏 패턴 돌파 실패 후 레벨 위로 종가 복귀 → 롱 쪽 경고(숏 무효·되돌림).",
    lower:
      "롱 패턴 돌파 실패 후 레벨 아래로 종가 재이탈 → 숏 쪽 경고(롱 무효).",
    worksWith: "돌파·리테스트·삼중 확인. 가짜 돌파가 뜨면 기존 패턴 진입을 무효로 보세요.",
    pros: "패턴 실패를 규칙으로 표시해 ‘모양만 보고 버티기’를 막습니다.",
    cons:
      "짧은 휩쏘도 가짜 돌파로 잡힐 수 있고, 실패 후 재돌파가 나오면 다시 판단해야 합니다.",
    tip: "불필요한 손실을 줄이려면 가짜 돌파 경고 시 손절·청산을 규칙화하세요.",
  },
};

export function patternStrategyHelp(id: PatternStrategyId): HelpContent {
  return PATTERN_STRATEGY_HELP[id];
}
