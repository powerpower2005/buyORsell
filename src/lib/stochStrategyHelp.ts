import type { HelpContent } from "./indicatorHelp";
import type { StochStrategyId } from "./stochStrategyMeta";
import { STOCH_STRATEGY_META } from "./stochStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const STOCH_STRATEGY_HELP: Record<StochStrategyId, HelpContent> = {
  stoch_ma20_cross: {
    title: "스토캐스틱 + 20일 이평",
    summary: STOCH_STRATEGY_META.stoch_ma20_cross.description,
    howToFind:
      "가격이 SMA20 위(상승 추세)에서 이평 근처로 눌린 뒤 %K가 %D를 상향 돌파하면 롱. 하락 추세·이평 반등 후 데드 크로스는 숏. SMA20 오버레이를 켜 두면 확인이 쉽습니다.",
    ...BREAK,
    higher: "SMA20 위 눌림 + 골든 → 롱. 손절은 최근 저점, 익절은 손익비 약 3:1 참고.",
    lower: "SMA20 아래 반등 + 데드 → 숏. 손절은 최근 고점.",
    tip: "과매도만 보고 바로 사지 마세요. 추세 필터(이평)가 핵심입니다.",
  },
  stoch_divergence: {
    title: "스토캐스틱 다이버전스",
    summary: STOCH_STRATEGY_META.stoch_divergence.description,
    howToFind:
      "가격 저점은 낮아지는데 %K 저점은 높아지면 상승 다이버전스(첫 저점은 과매도권). 확인 후 골든 크로스 봉에 마커가 찍힙니다.",
    ...BREAK,
    higher: "상승 다이버전스 + 골든 → 롱. 손절은 이전 저점.",
    lower: "하락 다이버전스 + 데드 → 숏. 손절은 이전 고점.",
    tip: "다이버전스만으로 진입하지 말고 K/D 교차·거래량으로 확인하세요.",
  },
  stoch_sr_bounce: {
    title: "스토캐스틱 지지·저항",
    summary: STOCH_STRATEGY_META.stoch_sr_bounce.description,
    howToFind:
      "지지/저항 존이 두 번 이상 반응한 뒤, 가격이 다시 존 근처일 때 %K가 20 상향(지지)·80 하향(저항)하는 봉을 찾습니다. S/R 레이어도 켜 두세요.",
    ...BREAK,
    higher: "지지 재접촉 + %K 20 상향 → 롱.",
    lower: "저항 재접촉 + %K 80 하향 → 숏.",
    tip: "존이 이미 깨진(broken) 구간은 신호가 약합니다.",
  },
  stoch_triple_bottom: {
    title: "스토캐스틱 3중 바닥",
    summary: STOCH_STRATEGY_META.stoch_triple_bottom.description,
    howToFind:
      "%K 스윙 저점이 세 번 연속 높아진 뒤, 세 번째 바닥 근처에서 골든 크로스가 나는 봉에 롱 마커가 생깁니다. 대칭으로 고점이 세 번 낮아지면 숏.",
    ...BREAK,
    higher: "3중 바닥 + 골든 → 롱. 익절은 손익비 약 3:1 참고.",
    lower: "3중 천장 + 데드 → 숏.",
    tip: "강한 하락 추세 중의 ‘가짜 3중 바닥’을 피하려면 이평·거래량과 함께 보세요.",
  },
};

export function stochStrategyHelp(id: StochStrategyId): HelpContent {
  return STOCH_STRATEGY_HELP[id];
}
