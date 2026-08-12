import type { HelpContent } from "./indicatorHelp";
import type { IchimokuStrategyId } from "./ichimokuStrategyMeta";
import { ICHIMOKU_STRATEGY_META } from "./ichimokuStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const ICHIMOKU_STRATEGY_HELP: Record<IchimokuStrategyId, HelpContent> = {
  ichi_tk_cross: {
    title: "전환·기준선 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_tk_cross.description,
    howToFind:
      "빨간 전환선이 파란 기준선을 아래에서 위로 뚫으면 매수(호전), 위에서 아래로 뚫으면 매도(역전). 교차만 봅니다.",
    ...LONG_SHORT,
    higher: "전환선이 기준선을 위로 뚫음 → 매수 후보.",
    lower: "전환선이 기준선을 아래로 뚫음 → 매도 후보.",
    worksWith:
      "기준선 방향, 종가가 기준선·구름 위/아래인지, ADX, 거래량, MACD. 기준선이 내려가는 중 호전은 보류하는 편이 안전합니다.",
    pros: "이평 교차처럼 추세 전환을 빠르게 보여 줍니다.",
    cons: "늦은 편이고 횡보 휩쏘가 많습니다. 다른 확인을 같이 켜세요.",
    tip: "기준선이 횡보·하락할 때 호전 신호는 ADX·구름 위치로 걸러 보세요.",
  },
  ichi_chikou_cross: {
    title: "후행스팬 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_chikou_cross.description,
    howToFind:
      "후행스팬은 지금 종가를 26봉 전 자리에 그린 선입니다. 그때 캔들을 위로 뚫으면 상승 전환, 아래로 깨면 하락 전환 후보입니다.",
    ...LONG_SHORT,
    higher: "후행스팬이 과거 캔들 위 → 상승 추세 확인·매수.",
    lower: "후행스팬이 과거 캔들 아래 → 하락 추세 확인·매도.",
    worksWith: "기준선 방향, 구름 색·위치, 전환·기준선 교차, 거래량·ADX.",
    tip: "후행만 보지 말고 구름·기준선과 같이 확인하세요.",
  },
  ichi_kumo_twist: {
    title: "구름 색 전환(비틀림)",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_twist.description,
    howToFind:
      "구름이 약세색에서 강세색으로 바뀌면 중장기 상승 우위, 반대로 바뀌면 하락 우위입니다. 색이 바뀌는 순간만 봅니다. 지금 가격이 구름 위/아래인지도 같이 보세요.",
    ...LONG_SHORT,
    higher: "강세 구름으로 전환 → 중장기 상승 우위.",
    lower: "약세 구름으로 전환 → 중장기 하락 우위.",
    worksWith: "현재 가격 vs 구름, 전환·기준선 교차, MACD 0선, 거래량.",
    tip: "구름이 두꺼울수록 전환 의미가 큽니다.",
  },
  ichi_price_kumo_break: {
    title: "가격 구름 돌파·이탈",
    summary: ICHIMOKU_STRATEGY_META.ichi_price_kumo_break.description,
    howToFind:
      "종가가 구름 위쪽을 위로 마감하면 상승 돌파, 구름 아래쪽을 아래로 마감하면 하락 이탈입니다. 종가 돌파만 봅니다.",
    ...LONG_SHORT,
    higher: "구름 상단 돌파 → 저항 해제·상승 공간 개방.",
    lower: "구름 하단 이탈 → 지지 상실·하락 공간 개방.",
    worksWith: "거래량, 장대 양/음봉, ADX. 얇은 구름은 돌파가 잦고, 두꺼운 구름 돌파는 힘이 큰 편입니다.",
    tip: "돌파 직후 되돌림 타점은 «구름 돌파 후 리테스트»를 같이 보세요.",
  },
  ichi_trend_turn: {
    title: "일목 추세 전환(4신호)",
    summary: ICHIMOKU_STRATEGY_META.ichi_trend_turn.description,
    howToFind:
      "최근 몇 봉 안에 ①종가↔기준선 ②전환·기준선 교차 ③후행스팬 교차 ④구름 색 전환이 같은 방향으로 모이면 신호가 납니다.",
    ...LONG_SHORT,
    higher: "네 신호 모두 상승 쪽 → 매수 후보.",
    lower: "네 신호 모두 하락 쪽 → 매도 후보.",
    worksWith: "이미 일목 안 신호를 묶은 전략입니다. 거래량·ADX·상위 타임프레임만 더하면 됩니다.",
    tip: "신호는 드물지만 ‘풀세트’ 확인용입니다. 하나둘만 있어도 방향 힌트는 됩니다.",
  },
  ichi_breakout: {
    title: "일목 돌파 매매",
    summary: ICHIMOKU_STRATEGY_META.ichi_breakout.description,
    howToFind:
      "후행스팬이 강하게 캔들을 뚫은 뒤, 장대 양·음봉으로 구름을 돌파하는 봉을 찾습니다. 바로 돌파형입니다.",
    ...LONG_SHORT,
    higher: "후행 상향 + 장대양봉 구름 상단 돌파 → 매수.",
    lower: "후행 하향 + 장대음봉 구름 하단 이탈 → 매도.",
    worksWith: "거래량, ADX, 추세선·지지저항. 되돌림 진입은 «구름 돌파 후 리테스트»를 쓰세요.",
    tip: "일목만보다 거래량·추세선과 함께 보면 도움이 됩니다.",
  },
  ichi_kumo_retest: {
    title: "구름 돌파 후 리테스트",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_retest.description,
    howToFind:
      "구름을 위로(아래로) 뚫은 뒤, 가격이 구름으로 되돌아와 닿았다가 다시 구름 위(아래)로 마감하는 봉을 찾습니다.",
    ...LONG_SHORT,
    higher: "상향 돌파 후 구름 터치→종가 재돌파 → 매수. 손절은 구름 하단 아래 참고.",
    lower: "하향 돌파 후 구름 터치→종가 재이탈 → 매도. 손절은 구름 상단 위 참고.",
    worksWith: "망치/유성, 거래량, ADX, 지지·저항.",
    tip: "즉시 돌파는 «일목 돌파»·«가격 구름 돌파», 되돌림 타점은 이 전략입니다.",
  },
  ichi_kumo_sr: {
    title: "구름 지지·저항",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_sr.description,
    howToFind:
      "강세 구름에서 구름 하단에 닿은 뒤 전환선이 위로 가면 매수. 약세 구름에서 구름 상단에 닿은 뒤 전환선이 아래로 가면 매도.",
    ...LONG_SHORT,
    higher: "강세 구름 지지 + 전환선 상향 → 매수. 손절은 구름 하단 아래.",
    lower: "약세 구름 저항 + 전환선 하향 → 매도. 손절은 구름 상단 위.",
    worksWith: "수평에 가까운 구름, 망치/유성, 거래량, 지지·저항·피보와 구름 가장자리 겹침.",
    tip: "구름이 두껍고 한쪽 경계가 평평할수록 지지·저항이 잘 먹는 편입니다.",
  },
};

export function ichimokuStrategyHelp(id: IchimokuStrategyId): HelpContent {
  return ICHIMOKU_STRATEGY_HELP[id];
}
