import type { HelpContent } from "./indicatorHelp";
import type { StochStrategyId } from "./stochStrategyMeta";
import { STOCH_STRATEGY_META } from "./stochStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const STOCH_STRATEGY_HELP: Record<StochStrategyId, HelpContent> = {
  stoch_ma20_cross: {
    title: "스토캐스틱 + 20일 이평",
    summary: STOCH_STRATEGY_META.stoch_ma20_cross.description,
    howToFind:
      "가격이 SMA20 위(상승 추세·이평 위 파동)에서 이평 근처로 눌린 뒤 %K가 %D를 상향 돌파하면 롱. 하락 추세·이평 아래 반등 후 데드 크로스는 숏. SMA20 오버레이를 켜 두세요. 이평과 가격이 밀착·혼선이면 고전 이평론처럼 관망이 낫습니다.",
    ...BREAK,
    higher: "SMA20 위 눌림 + 골든 → 롱. 손절은 최근 저점, 익절은 손익비 약 3:1 참고.",
    lower: "SMA20 아래 반등 + 데드 → 숏. 손절은 최근 고점.",
    worksWith:
      "SMA20(필수에 가깝음), MACD 0선(같은 방향인지), 거래량. 이미 이평 필터가 들어간 전략입니다.",
    pros:
      "이평으로 강·약세를 걸러 스토캐 과매도/과매수 역추세를 줄입니다. ‘이평 위/아래 파동’ 고전 성질과 잘 맞습니다.",
    cons:
      "단기 이평이라 민감·휩쏘가 있고, 이평 교차만의 후행성(이미 중반) 문제는 남습니다. 세 이평이 얽힌 보합에서는 신호가 잦아집니다.",
    tip: "과매도만 보고 바로 사지 마세요. 추세 필터(이평)가 핵심입니다.",
  },
  stoch_divergence: {
    title: "스토캐스틱 다이버전스",
    summary: STOCH_STRATEGY_META.stoch_divergence.description,
    howToFind:
      "가격 저점은 낮아지는데 %K 저점은 높아지면 상승 다이버전스(첫 저점은 과매도권). 확인 후 골든 크로스 봉에 마커가 찍힙니다. 엘리어트 5파·C파 말기 모멘텀 약화와 자주 겹칩니다.",
    ...BREAK,
    higher: "상승 다이버전스 + 골든 → 롱. 손절은 이전 저점.",
    lower: "하락 다이버전스 + 데드 → 숏. 손절은 이전 고점.",
    worksWith:
      "스윙 구조, 거래량, RSI·MACD 다이버전스, 지지·저항. K/D 교차 확인이 붙은 신호가 더 낫습니다.",
    pros:
      "추세 끝 모멘텀 약화를 스윙으로 포착합니다. 다우/이평만의 ‘지속’ 가정 한계를 보완합니다.",
    cons:
      "스윙·다이버전스 해석이 주관적이고 트랩이 잦습니다. 강한 3파 구간에서는 너무 이른 역추세가 됩니다.",
    tip: "다이버전스만으로 진입하지 말고 K/D 교차·거래량으로 확인하세요.",
  },
  stoch_sr_bounce: {
    title: "스토캐스틱 지지·저항",
    summary: STOCH_STRATEGY_META.stoch_sr_bounce.description,
    howToFind:
      "지지/저항 존이 두 번 이상 반응한 뒤, 가격이 다시 존 근처일 때 %K가 20 상향(지지)·80 하향(저항)하는 봉을 찾습니다. 갠이 중시한 역사적 고·저·역할 전환 자리입니다.",
    ...BREAK,
    higher: "지지 재접촉 + %K 20 상향 → 롱.",
    lower: "저항 재접촉 + %K 80 하향 → 숏.",
    worksWith:
      "지지·저항 레이어(필수에 가깝음), SMA/추세 방향, 거래량, 피보나치 겹침(엘리어트 2·4파). 존이 깨지지 않았는지 먼저 보세요.",
    pros:
      "가격 위치(S/R)+모멘텀 탈출을 겹쳐 타점이 선명합니다. 갠·피보 컨플루언스와 잘 맞습니다.",
    cons:
      "존·스윙 선택이 주관적이고, 강한 추세에서는 지지/저항이 한 번에 붕괴됩니다. 존이 깨진 뒤에도 신호를 믿으면 위험합니다.",
    tip: "존이 이미 깨진(broken) 구간은 신호가 약합니다.",
  },
  stoch_triple_bottom: {
    title: "스토캐스틱 3중 바닥",
    summary: STOCH_STRATEGY_META.stoch_triple_bottom.description,
    howToFind:
      "%K 스윙 저점이 세 번 연속 높아진 뒤, 세 번째 바닥 근처에서 골든 크로스가 나는 봉에 롱 마커가 생깁니다. 대칭으로 고점이 세 번 낮아지면 숏. 가격 삼중 바닥·엘리어트 조정 종료 감각과 맞닿습니다.",
    ...BREAK,
    higher: "3중 바닥 + 골든 → 롱. 익절은 손익비 약 3:1 참고.",
    lower: "3중 천장 + 데드 → 숏.",
    worksWith:
      "SMA20·MACD 0선(하락 추세가 꺾였는지), 거래량, 가격 차트 이중·삼중 바닥. 강한 하락장 중의 가짜 바닥을 걸러 줍니다.",
    pros:
      "반복되는 저점 상승(HL 연속)을 규칙화해 전환 후보를 잡습니다. ‘시장은 반복된다’ 전제와 맞습니다.",
    cons:
      "강한 하락(엘리어트 C파) 중 가짜 3중 바닥이 많고, 형태 인식이 주관적·후행입니다. 이평 필터 없이 쓰면 위험합니다.",
    tip: "강한 하락 추세 중의 ‘가짜 3중 바닥’을 피하려면 이평·거래량과 함께 보세요.",
  },
};

export function stochStrategyHelp(id: StochStrategyId): HelpContent {
  return STOCH_STRATEGY_HELP[id];
}
