import type { HelpContent } from "./indicatorHelp";
import type { StochStrategyId } from "./stochStrategyMeta";
import { STOCH_STRATEGY_META } from "./stochStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const STOCH_STRATEGY_HELP: Record<StochStrategyId, HelpContent> = {
  stoch_ma20_cross: {
    title: "스토캐스틱 + 20일 이평",
    summary: STOCH_STRATEGY_META.stoch_ma20_cross.description,
    howToFind:
      "사이드바에서 스토캐와 SMA20을 켭니다. 빠른 선(청록, %K)이 느린 선(주황, %D)을 위로 뚫고, 가격이 20일선 위에서 선 근처로 눌린 뒤면 매수. 20일선 아래에서 반등한 뒤 빠른 선이 느린 선을 아래로 뚫으면 매도. 이평이 엉키거나 횡보면 관망하세요.",
    ...LONG_SHORT,
    higher:
      "20일선 위 눌림 + 빠른 선이 느린 선을 위로 뚫음 → 매수. 손절은 최근 저점, 익절은 손익비 약 3:1을 참고.",
    lower:
      "20일선 아래 반등 + 빠른 선이 느린 선을 아래로 뚫음 → 매도. 손절은 최근 고점.",
    worksWith:
      "SMA20(필수), 거래량·ADX·MACD. 스토캐만 보지 말고 이평 위/아래를 먼저 확인하세요.",
    pros:
      "이평으로 강세·약세를 걸러, ‘너무 내렸다’만 보고 사는 실수를 줄입니다.",
    cons:
      "단기 이평이라 가짜 신호가 있고, 신호가 나올 때 이미 움직임이 진행된 경우가 많습니다. 횡보에서는 신호가 잦습니다.",
    tip: "너무 내렸다(과매도)만 보고 사지 마세요. 20일선 위인지가 핵심입니다.",
  },
  stoch_divergence: {
    title: "스토캐스틱 다이버전스",
    summary: STOCH_STRATEGY_META.stoch_divergence.description,
    howToFind:
      "주가는 더 낮은 저점을 찍었는데 스토캐 저점은 높아지면(상승 다이버전스) → 매수 후보. 확인으로 빠른 선이 느린 선을 위로 뚫을 때 신호가 납니다. 반대로 주가 고점은 더 높은데 스토캐 고점은 낮아지면(하락 다이버전스) → 매도 후보.",
    ...LONG_SHORT,
    higher: "상승 다이버전스 + 빠른 선이 느린 선을 위로 뚫음 → 매수. 손절은 이전 저점.",
    lower: "하락 다이버전스 + 빠른 선이 느린 선을 아래로 뚫음 → 매도. 손절은 이전 고점.",
    worksWith:
      "지지·저항, 거래량, SMA20, ADX. RSI·MACD 다이버전스가 겹치면 더 믿을 만합니다.",
    pros: "추세가 끝날 때 힘이 빠지는 모습을 잡기 좋습니다.",
    cons:
      "강한 추세 한가운데에서는 너무 일찍 반대로 들어가기 쉽습니다. 교차·자리 확인 없이 쓰지 마세요.",
    tip: "다이버전스만으로 들어가지 마세요. 선 교차와 지지·저항을 같이 보세요.",
  },
  stoch_sr_bounce: {
    title: "스토캐스틱 지지·저항",
    summary: STOCH_STRATEGY_META.stoch_sr_bounce.description,
    howToFind:
      "지지선에 다시 닿았을 때 빠른 선이 20 아래에서 위로 올라오면 매수. 저항선에 다시 닿았을 때 빠른 선이 80 위에서 아래로 내려오면 매도. ‘너무 올랐다/내렸다’만 보지 말고, 지지·저항과 겹칠 때만 봅니다.",
    ...LONG_SHORT,
    higher: "지지 재접촉 + 빠른 선이 20을 위로 뚫음 → 매수.",
    lower: "저항 재접촉 + 빠른 선이 80을 아래로 뚫음 → 매도.",
    worksWith: "지지·저항(필수), SMA20, 거래량, ADX. 이미 깨진 구간은 신호가 약합니다.",
    pros: "가격 위치와 모멘텀이 겹쳐 타점이 비교적 분명합니다.",
    cons: "지지·저항을 잘못 잡으면 신호가 흔들립니다. 강한 추세에서는 선이 잘 깨집니다.",
    tip: "이미 깨진 지지·저항에서는 신호를 가볍게 보세요.",
  },
  stoch_triple_bottom: {
    title: "스토캐스틱 3중 바닥",
    summary: STOCH_STRATEGY_META.stoch_triple_bottom.description,
    howToFind:
      "스토캐 빠른 선의 저점이 세 번 높아진 뒤, 빠른 선이 느린 선을 위로 뚫으면 매수. 고점이 세 번 낮아진 뒤 아래로 뚫으면 매도(3중 천장). SMA20·거래량으로 가짜 바닥을 거르세요.",
    ...LONG_SHORT,
    higher: "저점 세 번 상승 + 위로 뚫음 → 매수. 익절은 손익비 약 3:1 참고.",
    lower: "고점 세 번 하락 + 아래로 뚫음 → 매도.",
    worksWith: "SMA20, 거래량, 지지·저항, ADX. 가격 차트에도 비슷한 바닥이 있으면 더 좋습니다.",
    pros: "바닥·천장이 여러 번 높아지거나 낮아지는 전환을 규칙으로 잡습니다.",
    cons: "강한 하락 중에는 가짜 바닥이 많고, 이평 없이 쓰면 위험합니다.",
    tip: "하락 추세 중 가짜 바닥은 이평·거래량과 같이 보세요.",
  },
};

export function stochStrategyHelp(id: StochStrategyId): HelpContent {
  return STOCH_STRATEGY_HELP[id];
}
