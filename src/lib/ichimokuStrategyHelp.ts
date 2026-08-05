import type { HelpContent } from "./indicatorHelp";
import type { IchimokuStrategyId } from "./ichimokuStrategyMeta";
import { ICHIMOKU_STRATEGY_META } from "./ichimokuStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const ICHIMOKU_STRATEGY_HELP: Record<IchimokuStrategyId, HelpContent> = {
  ichi_tk_cross: {
    title: "전환·기준선 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_tk_cross.description,
    howToFind:
      "빨간 전환선이 파란 기준선을 아래에서 위로 뚫으면 호전(롱), 위에서 아래로 뚫으면 역전(숏). 엔트리는 교차만 봅니다.",
    ...BREAK,
    higher: "호전(전환선↑기준선) → 롱 후보.",
    lower: "역전(전환선↓기준선) → 숏 후보.",
    worksWith:
      "같이 켤 지표: 기준선 방향·종가 vs 기준선·구름 위/아래(일목 차트), ADX(추세), 거래량, MACD. 기준선 하락 중 호전은 보류하는 편이 안전합니다.",
    pros:
      "이평 교차식 추세 전환을 일목 안에서 빠르게 표시합니다. 필터를 최소로 두어 놓치지 않습니다.",
    cons:
      "후행·횡보 휩쏘가 많고, 골든처럼 이미 중반인 경우가 많습니다. 신뢰도는 companion으로 올리세요.",
    tip: "기준선이 횡보·하락할 때 호전 신호는 companion(ADX·구름 위치)로 걸러 보세요. 하드 게이트는 아닙니다.",
  },
  ichi_chikou_cross: {
    title: "후행스팬 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_chikou_cross.description,
    howToFind:
      "후행스팬(현재 종가를 26봉 뒤)이 당시 캔들을 상향 돌파하면 상승 전환, 하향 이탈하면 하락 전환 후보입니다. 엔트리는 그 교차만 봅니다.",
    ...BREAK,
    higher: "후행스팬이 과거 캔들 위 → 상승 추세 확인·롱.",
    lower: "후행스팬이 과거 캔들 아래 → 하락 추세 확인·숏.",
    worksWith:
      "기준선 방향, 구름 색·위치, TK 교차, 거래량·ADX. 후행만 보지 말고 같이 확인하세요.",
    tip: "과거 주가와 이격이 과도하면 단기 되돌림을 염두에 두세요(companion 감각). 단일 신호로 과신하지 마세요.",
  },
  ichi_kumo_twist: {
    title: "구름 색 전환(비틀림)",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_twist.description,
    howToFind:
      "선행스팬1이 2를 상향 돌파하면 음운→양운, 하향이면 양운→음운. 엔트리는 색 전환만 봅니다.",
    ...BREAK,
    higher: "양운 전환 → 중장기 상승 우위.",
    lower: "음운 전환 → 중장기 하락 우위.",
    worksWith:
      "현재 가격 vs 구름, TK 교차, MACD 0선, 거래량. 미래 구름만 바뀌고 가격이 반대면 신중히.",
    tip: "구름이 두꺼울수록 전환 의미가 큽니다. 두께·거래량은 companion으로 확인하세요.",
  },
  ichi_price_kumo_break: {
    title: "가격 구름 돌파·이탈",
    summary: ICHIMOKU_STRATEGY_META.ichi_price_kumo_break.description,
    howToFind:
      "종가가 구름 상단(두 선행스팬 중 위)을 위로 마감하면 상승 돌파, 하단을 아래로 마감하면 하락 이탈입니다. 엔트리는 종가 돌파만 봅니다.",
    ...BREAK,
    higher: "구름 상단 돌파 → 저항 해제·상승 공간 개방.",
    lower: "구름 하단 이탈 → 지지 상실·하락 공간 개방.",
    worksWith:
      "거래량·장대양/음·ADX(가짜 돌파 걸러내기). 얇은 구름은 돌파가 잦고, 두꺼운 구름 돌파는 힘이 큰 편입니다.",
    tip: "돌파 직후 되돌림 타점은 `구름 돌파 후 리테스트` 전략을 같이 보세요.",
  },
  ichi_trend_turn: {
    title: "일목 추세 전환(4신호)",
    summary: ICHIMOKU_STRATEGY_META.ichi_trend_turn.description,
    howToFind:
      "최근 몇 봉 안에 ①종가↔기준선 돌파 ②TK 호전/역전 ③후행스팬 호전/역전 ④구름 색 전환이 같은 방향으로 모이면 마커가 찍힙니다.",
    ...BREAK,
    higher: "네 신호 모두 상승 쪽 → 롱 진입 후보.",
    lower: "네 신호 모두 하락 쪽 → 숏 진입 후보.",
    worksWith:
      "이미 일목 내부 신호를 묶은 전략입니다. 거래량·ADX·상위 타임프레임만 companion으로 더하면 충분합니다.",
    tip: "신호는 드물지만 교재식 ‘풀세트’ 확인용입니다. 하나둘만 있어도 방향 힌트는 됩니다.",
  },
  ichi_breakout: {
    title: "일목 돌파 매매",
    summary: ICHIMOKU_STRATEGY_META.ichi_breakout.description,
    howToFind:
      "후행스팬이 강하게 캔들을 돌파한 뒤, 장대 양·음봉으로 구름을 돌파하는 봉을 찾습니다. 즉시 돌파형입니다.",
    ...BREAK,
    higher: "후행 상향 + 장대양봉 구름 상단 돌파 → 롱.",
    lower: "후행 하향 + 장대음봉 구름 하단 이탈 → 숏.",
    worksWith:
      "거래량·ADX·추세선(S/R). 되돌림 진입은 `ichi_kumo_retest`를 쓰세요.",
    tip: "손익비 2:1은 참고용입니다. 일목 단독보다 거래량·추세선과 함께 보면 도움이 됩니다.",
  },
  ichi_kumo_retest: {
    title: "구름 돌파 후 리테스트",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_retest.description,
    howToFind:
      "최근 구름 상향(하향) 돌파 이후, 가격이 구름으로 되돌아와 닿았다가 다시 구름 위(아래)로 마감하는 봉을 찾습니다. 꼬리 캔들은 companion입니다.",
    ...BREAK,
    higher:
      "상향 돌파 후 구름 터치→종가 재돌파 → 롱. 손절은 구름 하단 아래 참고.",
    lower:
      "하향 돌파 후 구름 터치→종가 재이탈 → 숏. 손절은 구름 상단 위 참고.",
    worksWith:
      "망치/유성(되돌림 거부 꼬리), 거래량, ADX, 지지·저항. 익절 손익비 2:1은 참고.",
    tip: "즉시 돌파 진입은 `ichi_breakout`·`ichi_price_kumo_break`, 되돌림 타점은 이 전략입니다.",
  },
  ichi_kumo_sr: {
    title: "구름 지지·저항",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_sr.description,
    howToFind:
      "양운에서 구름 하단 터치 후 전환선 상향, 음운에서 구름 상단 터치 후 전환선 하향. 엔트리는 터치+전환선만 봅니다.",
    ...BREAK,
    higher: "양운 지지 + 전환선 상향 → 롱. 손절은 양운 하단 아래.",
    lower: "음운 저항 + 전환선 하향 → 숏. 손절은 음운 상단 위.",
    worksWith:
      "선행스팬2가 평평한지(일목 차트), 망치/유성, 거래량, S/R·피보와 구름 가장자리 겹침.",
    tip: "구름이 두껍고 SpanB가 수평일수록 지지·저항이 잘 먹는 편입니다 — companion으로 확인하세요.",
  },
};

export function ichimokuStrategyHelp(id: IchimokuStrategyId): HelpContent {
  return ICHIMOKU_STRATEGY_HELP[id];
}
