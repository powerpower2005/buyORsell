import type { HelpContent } from "./indicatorHelp";
import type { StochStrategyId } from "./stochStrategyMeta";
import { STOCH_STRATEGY_META } from "./stochStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const STOCH_STRATEGY_HELP: Record<StochStrategyId, HelpContent> = {
  stoch_ma20_cross: {
    title: "스토캐스틱 + 20일 이평",
    summary: STOCH_STRATEGY_META.stoch_ma20_cross.description,
    howToFind:
      "가격이 SMA20 위(이평 위 파동)에서 이평 근처로 눌린 뒤 %K가 %D를 상향 돌파하면 롱. 이평 아래 반등 후 데드는 숏. SMA20을 켜 두세요. 이평 혼선·횡보면 ADX·관망. 스토캐 단독 OB/OS·단독 %D 교차보다 추세+크로스에 가깝습니다.",
    ...BREAK,
    higher: "SMA20 위 눌림 + 골든 → 롱. 손절은 최근 저점, 익절은 손익비 약 3:1 참고.",
    lower: "SMA20 아래 반등 + 데드 → 숏. 손절은 최근 고점.",
    worksWith:
      "SMA20(코어), 거래량·ADX·MACD companion. %K/%D 후행은 이평·수급으로 완화.",
    pros:
      "이평으로 강·약세를 걸러 과매도/과매수 역추세를 줄입니다. 파동·이평 결합 고전 감각과 맞습니다.",
    cons:
      "단기 이평이라 휩쏘·후행(이미 중반)이 남습니다. 보합·이평 엉킴에서 신호↑.",
    tip: "과매도만 보고 사지 마세요. 추세 필터(이평)가 핵심입니다.",
  },
  stoch_divergence: {
    title: "스토캐스틱 다이버전스",
    summary: STOCH_STRATEGY_META.stoch_divergence.description,
    howToFind:
      "가격 LL + %K HL(첫 저점 OS권) → 상승 다이버전스, 확인 후 골든 봉에 마커. 반대는 HH+%K LH+데드. 지표만의 다이버전스 매매는 함정 — S/R·캔들·교차로 확인.",
    ...BREAK,
    higher: "상승 다이버전스 + 골든 → 롱. 손절은 이전 저점.",
    lower: "하락 다이버전스 + 데드 → 숏. 손절은 이전 고점.",
    worksWith:
      "S/R·거래량·SMA20·ADX companion. RSI/MACD 다이버전스 이중 확인.",
    pros:
      "추세 말 모멘텀 약화를 스윙으로 포착. 이평 ‘지속’만의 한계를 보완.",
    cons:
      "주관·트랩↑. 강한 추세 중 이른 역추세. 다이버전스 단독 금지.",
    tip: "K/D 교차·거래량·자리(S/R) 없이 진입하지 마세요.",
  },
  stoch_sr_bounce: {
    title: "스토캐스틱 지지·저항",
    summary: STOCH_STRATEGY_META.stoch_sr_bounce.description,
    howToFind:
      "터치≥2 지지/저항 재접촉 시 %K가 20 상향(지지)·80 하향(저항). OB/OS는 자리와 겹칠 때만 — 단독 과열 신호 남발과 구분.",
    ...BREAK,
    higher: "지지 재접촉 + %K 20 상향 → 롱.",
    lower: "저항 재접촉 + %K 80 하향 → 숏.",
    worksWith:
      "S/R(코어), SMA20·거래량·ADX companion. 존 broken이면 약함.",
    pros:
      "가격 위치+모멘텀 탈출이 겹쳐 타점이 선명합니다.",
    cons:
      "존 선택 주관·강한 추세에서 존 붕괴. 깨진 존 신호 신뢰↓.",
    tip: "존이 이미 깨진 구간은 신호가 약합니다.",
  },
  stoch_triple_bottom: {
    title: "스토캐스틱 3중 바닥",
    summary: STOCH_STRATEGY_META.stoch_triple_bottom.description,
    howToFind:
      "%K 로컬 저 3개가 높아진 뒤 골든 → 롱. 고 3개 낮아진 뒤 데드 → 숏(3중 천장). 패턴만 믿지 말고 SMA20·거래량으로 가짜 바닥을 거르세요.",
    ...BREAK,
    higher: "3중 바닥 + 골든 → 롱. 익절은 손익비 약 3:1 참고.",
    lower: "3중 천장 + 데드 → 숏.",
    worksWith:
      "SMA20·거래량·S/R·ADX companion. 가격 삼중 바닥과 겹치면 신뢰↑.",
    pros:
      "HL 연속을 규칙화해 전환 후보를 잡습니다.",
    cons:
      "강한 하락 중 가짜 3중 바닥·후행. 이평 없이 쓰면 위험.",
    tip: "하락 추세 중 가짜 바닥은 이평·거래량과 같이 보세요.",
  },
};

export function stochStrategyHelp(id: StochStrategyId): HelpContent {
  return STOCH_STRATEGY_HELP[id];
}
