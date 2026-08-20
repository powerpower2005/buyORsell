import type { HelpContent } from "./indicatorHelp";
import type { IchimokuStrategyId } from "./ichimokuStrategyMeta";
import { ICHIMOKU_STRATEGY_META } from "./ichimokuStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const ICHIMOKU_STRATEGY_HELP: Record<IchimokuStrategyId, HelpContent> = {
  ichi_tk_cross: {
    title: "전환·기준선 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_tk_cross.description,
    howBuilt:
      "전환=(9봉 고+저)/2, 기준=(26봉 고+저)/2 — 종가 이평이 아니라 최근 고저 한가운데입니다. 전환이 기준을 위로 뚫으면 단기 균형이 중기 균형보다 비싸진 것=호전(골든크로스와 같은 논리)입니다. 기준이 평평·하락이면 중기 고저가 안 바뀌거나 내려가는 중이라 호전만으로 추세 전환이라 보기 어렵습니다.",
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
    howBuilt:
      "후행스팬=오늘 종가를 26봉 전 자리에 그린 것입니다. 그때 캔들 고점을 오늘 종가가 넘으면, 26봉 전의 매물·가격을 ‘지금 종가’가 이긴 확인입니다. 앱은 이전 종가≤과거 고 → 이번 종가>과거 고(하락은 저점 이탈)일 때만 교차로 칩니다.",
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
    howBuilt:
      "구름=선행1((전환+기준)/2)과 선행2(52봉 고저 중간)를 26봉 앞에 그린 띠. 선행1이 선행2를 위로 뚫으면 단기·중기 균형이 장기 균형 위로 올라간 것=양운(강세 배열)입니다. 색이 바뀌는 그 봉만 신호입니다.",
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
    howBuilt:
      "구름 상단=max(선행1,선행2), 하단=min. 이전 종가가 상단 아래였다가 이번 종가가 상단 위면, 26봉 앞 균형대(미래 지지·저항으로 밀어 둔 구간)를 종가로 벗어난 것입니다. 꼬리만 뚫으면 미완성. 얇은 구름은 두 선행이 붙어 있어 쉽게 뚫립니다.",
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
    howBuilt:
      "최근 5봉 안에 ①종가↔기준선 ②전환·기준 교차 ③후행스팬 교차 ④구름 색 전환이 같은 방향이어야 합니다. 단기·중기·과거 확인·장기 배열이 한꺼번에 같은 쪽이면 ‘한눈’ 균형이 바뀌었다고 보는 합류입니다. 하나둘만으로는 이 전략 신호가 없습니다.",
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
    howBuilt:
      "후행이 과거 캔들을 강하게 뚫은 뒤, 몸통이 큰 봉으로 구름 가장자리를 종가 돌파합니다. 후행=지금 종가 vs 26봉 전, 구름=26봉 앞 균형대라, ‘과거도 이기고 미래 저항도 종가로 넘긴’ 가속 돌파로 봅니다.",
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
    howBuilt:
      "최근 12봉 안 구름 종가 돌파 후, 저점(고점)이 구름 가장자리에 닿았다가 종가가 다시 구름 밖이면 역할 전환입니다. 깨졌던 저항이 지지로 남는 고전 S/R과 같습니다. 꼬리·거래량은 같이 켤 지표입니다.",
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
    howBuilt:
      "양운에서 구름 하단 터치 후 종가가 전환선을 위로 뚫으면, 장기 균형대(선행2)를 지키며 단기 균형이 다시 올라간 지지입니다. 음운+상단+전환 하향은 그 반대. 앱은 SpanB가 평평한지·양음봉은 하드 조건이 아닙니다.",
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
