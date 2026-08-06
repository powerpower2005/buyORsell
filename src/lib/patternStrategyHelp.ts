import type { HelpContent } from "./indicatorHelp";
import type { PatternStrategyId } from "./patternStrategyMeta";
import { PATTERN_STRATEGY_META } from "./patternStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

/** Shared note: options PCR is out of scope for this OHLC app. */
const NO_PCR =
  "PCR/PCROI(옵션)는 이 앱 데이터에 없음. 대체: 종가 돌파 · 거래량 · RSI · MACD · 리테스트 · 망치/잉걸핑.";

export const PATTERN_STRATEGY_HELP: Record<PatternStrategyId, HelpContent> = {
  breakout_entry: {
    title: "목선·레벨 돌파 진입",
    summary: PATTERN_STRATEGY_META.breakout_entry.description,
    howToFind:
      "차트 패턴이 ‘완성’으로 잡힌 봉 = 목선·저항·지지 종가 돌파 봉입니다. Breakout=저항 상향, Breakdown=지지 하향. 이 전략은 완성 봉에 바로 진입 마커를 올립니다.",
    ...BREAK,
    higher: "롱 패턴 완성 봉에서 매수 진입 후보.",
    lower: "숏 패턴 완성 봉에서 매도/숏 진입 후보. 가짜 돌파·스탑 헌팅에 취약할 수 있음.",
    worksWith:
      "돌파 다음 봉 확인, 거래량 확인 돌파, 리테스트, 가짜 돌파 경고, RSI·MACD, 망치/잉걸핑.",
    pros:
      "패턴 완성 즉시 들어가 추세를 일찍 탑니다. 목표가(패턴 높이)와 연결하기 쉽습니다.",
    cons:
      "첫 돌파(a시점)라 휩쏘·스탑 헌팅에 취약합니다. 거래량 없는 돌파는 무효(invalid)일 수 있습니다.",
    tip: `공격적 진입. 커리큘럼은 돌파 봉 진입 금지 → 「돌파 다음 봉 확인」을 우선. ${NO_PCR}`,
  },
  breakout_confirm_entry: {
    title: "돌파 다음 봉 확인 진입",
    summary: PATTERN_STRATEGY_META.breakout_confirm_entry.description,
    howToFind:
      "패턴이 종가 돌파로 완성된 **다음 봉**이 같은 방향 확인 봉(롱: 양봉·레벨 위 유지 / 숏: 음봉·레벨 아래 유지)일 때만 신호가 납니다. 돌파 봉(a)에는 마커가 없습니다.",
    ...BREAK,
    higher:
      "강세 돌파 다음 봉이 양봉이고 레벨 위에서 버티면 롱. 3중 바닥 등에서 커리큘럼 기본 타이밍.",
    lower:
      "약세 돌파 다음 봉이 음봉이고 레벨 아래를 유지하면 숏.",
    worksWith:
      "거래량 확인 돌파 · 리테스트 · 삼중 확인 · RSI · MACD · 가짜 돌파 경고.",
    pros:
      "돌파 봉 휩쏘를 한 봉 걸러 가짜 돌파를 줄입니다. 삼중·삼각형 커리큘럼과 맞습니다.",
    cons:
      "한 봉 늦게 들어가 추격·놓침이 생길 수 있습니다. 갭 질주 구간에서는 리테스트가 더 나을 수 있습니다.",
    tip: `돌파 봉에 바로 사지 마세요. 다음 봉이 반대로 닫히면 이 전략 신호 없음. ${NO_PCR}`,
  },
  retest_entry: {
    title: "리테스트 안전 진입",
    summary: PATTERN_STRATEGY_META.retest_entry.description,
    howToFind:
      "패턴 돌파 이후 수 봉 안에 가격이 돌파 레벨 근처로 되돌아와(리테스트) 확인 양봉/음봉이 나오는 봉을 찾습니다. 직사각형·삼각형에서 가짜 돌파를 줄이는 데 특히 유리합니다.",
    ...BREAK,
    higher: "롱: 돌파 후 눌림→레벨 지지+양봉 확인 시 진입. 망치·불리시 잉걸핑이면 신뢰↑.",
    lower: "숏: 돌파 후 반등→레벨 저항+음봉 확인 시 진입. 유성·베어리시 잉걸핑이면 신뢰↑.",
    worksWith: "망치/잉걸핑 · 거래량 · RSI · MACD · 가짜 돌파 경고 · S/R.",
    pros:
      "역할 전환을 확인한 뒤라 가짜 돌파를 줄입니다. 손절(레벨 재이탈)이 명확합니다.",
    cons:
      "확인을 기다려 후행·놓치는 움직임이 큽니다. 리테스트 없이 달리는 구간에서는 신호 없음.",
    tip: `성급한 돌파보다 안정적. 시가(갭)만으로 방향을 단정하지 마세요 — 종가·리테스트가 우선. ${NO_PCR}`,
  },
  volume_breakout: {
    title: "거래량 확인 돌파",
    summary: PATTERN_STRATEGY_META.volume_breakout.description,
    howToFind:
      "패턴 완성(돌파) 봉의 거래량이 직전 약 20봉 평균의 1.35배 이상일 때만 신호가 납니다. 옵션 PCR 변화가 ‘유효 돌파’를 뒷받침하는 것과 같은 역할을, 주식 OHLCV에서는 거래량(·OBV)이 담당합니다.",
    ...BREAK,
    higher: "거래량 동반 상향 돌파 → 롱 신뢰↑ (valid breakout 후보).",
    lower: "거래량 동반 하향 이탈 → 숏 신뢰↑. 평균 이하면 이 전략 마커 없음 (invalid 후보).",
    worksWith:
      "돌파·리테스트·삼중 확인, RSI·MACD, OBV, 스윙. 1차=가격(패턴), 2차=거래량.",
    pros:
      "허위 돌파를 줄이는 필터. 참여가 큰 구간과 잘 맞습니다.",
    cons:
      "거래량만으로는 방향이 안 나옵니다. 저유동 종목에서는 신호가 드뭅니다. PCR 수치는 제공하지 않습니다.",
    tip: NO_PCR,
  },
  triple_confirm: {
    title: "삼중 확인 진입",
    summary: PATTERN_STRATEGY_META.triple_confirm.description,
    howToFind:
      "① 패턴 목선·레벨 종가 돌파 ② 돌파 봉 거래량 ≥ 최근 20봉 평균 ×1.35 ③ 이후 리테스트에서 확인 양봉/음봉 — 세 조건이 모두 갖춰진 리테스트 봉에만 마커가 생깁니다.",
    ...BREAK,
    higher: "롱: 종가 상향 돌파+거래량 후, 레벨 지지 리테스트·양봉 확인 시 진입.",
    lower: "숏: 종가 하향 이탈+거래량 후, 레벨 저항 리테스트·음봉 확인 시 진입.",
    worksWith:
      "모든 클래식 차트 패턴 · RSI · MACD · 망치/잉걸핑 · 가짜 돌파 경고.",
    pros:
      "종가·거래량·리테스트로 가짜 돌파에 가장 강합니다.",
    cons: "조건이 많아 신호가 드물고 후행합니다.",
    tip: `패턴·정확도 %를 맹신하지 마세요. 이 세 확인이 실전 필터입니다. ${NO_PCR}`,
  },
  fake_breakout: {
    title: "가짜 돌파 · 가짜 이탈 경고",
    summary: PATTERN_STRATEGY_META.fake_breakout.description,
    howToFind:
      "패턴이 종가 돌파로 완성된 뒤 약 15봉 안을 봅니다. (1) 종가 재관통=False Breakout/Breakdown → 반대 방향 경고. (2) 윅만 레벨을 뚫고 종가는 회복=스탑 헌팅형 가짜 이탈 → 원래 돌파 방향 유지·회복 신호. 기관이 스탑이 몰린 레벨을 살짝 깨고 되돌리는 흐름과 같은 감각입니다.",
    ...BREAK,
    higher:
      "숏 돌파 실패(종가 재상향) → 롱 경고. 또는 롱 돌파 후 지지 윅 이탈·종가 회복(헌팅) → 롱 쪽 회복 신호. 망치·불리시 잉걸핑이면 신뢰↑.",
    lower:
      "롱 돌파 실패(종가 재하향) → 숏 경고. 또는 숏 돌파 후 저항 윅 돌파·종가 회복(헌팅) → 숏 쪽 회복 신호. 유성·베어리시 잉걸핑이면 신뢰↑.",
    worksWith:
      "트랩 진입 · 망치/잉걸핑 · 거래량 · RSI · MACD · 돌파·리테스트·삼중 확인. volume의 failed_breakout_short(VWAP)와는 다름.",
    pros:
      "실패·헌팅을 규칙으로 표시해 ‘모양만 보고 버티기’를 막습니다. 가짜 이탈 후 빠른 움직임을 놓치지 않게 돕습니다.",
    cons:
      "짧은 휩쏘도 잡힐 수 있고, 실패 후 재돌파는 다시 판단해야 합니다. PCR·호가창(스탑 밀도)은 없습니다. RR 계획은 trap_entry를 쓰세요.",
    tip: `경고 전용. 반대 방향 진입·확장 목표는 「트랩 진입」. ${NO_PCR}`,
  },
  trap_entry: {
    title: "트랩(가짜 돌파) 진입",
    summary: PATTERN_STRATEGY_META.trap_entry.description,
    howToFind:
      "확정 패턴 돌파 후 종가가 레벨을 재관통하면(실패) 그 봉에서 반대 방향 진입 마커·RR이 생깁니다. 깃발·페넌트·삼각형 등 모든 확정 패턴에 적용. 윅 헌팅(종가 회복)은 트랩이 아니라 fake_breakout 회복 신호입니다.",
    ...BREAK,
    higher:
      "약세 돌파 실패(종가 재상향) → 롱 트랩. 손절=실패 저점 아래(+버퍼). 목표≈패턴 높이×1.35(공황 확장).",
    lower:
      "강세 돌파 실패(종가 재하향) → 숏 트랩. 손절=실패 고점 위(+버퍼). 목표≈패턴 높이×1.35.",
    worksWith:
      "가짜 돌파 경고 · 망치/잉걸핑 · 거래량 · RSI · MACD. 일반 돌파 목표가보다 크게 잡을 수 있음.",
    pros:
      "실패를 기회로 전환. 측정이동보다 큰 목표가(×1.35)로 트랩 커리큘럼과 맞춤.",
    cons:
      "공격적. 재돌파·이중 실패면 손절이 빠름. 랏·레버리지는 작게.",
    tip: `진입은 패턴 실패 규칙, 청산은 가격 움직임·RR(1:2~)을 우선. ${NO_PCR}`,
  },
};

export function patternStrategyHelp(id: PatternStrategyId): HelpContent {
  return PATTERN_STRATEGY_HELP[id];
}
