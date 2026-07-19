import type { HelpContent } from "./indicatorHelp";
import type { IchimokuStrategyId } from "./ichimokuStrategyMeta";
import { ICHIMOKU_STRATEGY_META } from "./ichimokuStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const ICHIMOKU_STRATEGY_HELP: Record<IchimokuStrategyId, HelpContent> = {
  ichi_tk_cross: {
    title: "전환·기준선 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_tk_cross.description,
    howToFind:
      "빨간 전환선이 파란 기준선을 아래에서 위로 뚫으면 호전(롱), 위에서 아래로 뚫으면 역전(숏). 종가가 기준선 위·기준선 상승 중이면 호전 신뢰도가 커집니다.",
    ...BREAK,
    higher: "호전 + 종가>기준선 + 기준선 상승 → 매수 유리.",
    lower: "역전 + 종가<기준선 + 기준선 하락 → 매도 유리.",
    worksWith:
      "구름 위치(가격이 구름 위/아래), 후행스팬, 거래량. 기준선 방향과 구름이 같으면 신뢰↑.",
    tip: "기준선이 횡보할 때는 교차 신호 신뢰도가 떨어집니다.",
  },
  ichi_chikou_cross: {
    title: "후행스팬 호전·역전",
    summary: ICHIMOKU_STRATEGY_META.ichi_chikou_cross.description,
    howToFind:
      "보라 후행스팬(현재 종가를 26봉 뒤로)이 당시 캔들을 상향 돌파하면 상승 전환, 하향 이탈하면 하락 전환 후보입니다.",
    ...BREAK,
    higher: "후행스팬이 과거 캔들 위 → 상승 추세 확인·롱.",
    lower: "후행스팬이 과거 캔들 아래 → 하락 추세 확인·숏.",
    worksWith:
      "기준선 방향, 구름 색·위치, TK 호전/역전. 후행만 보지 말고 기준선·구름과 같이 확인하세요.",
    tip: "이격이 과도하면 단기 되돌림을 염두에 두세요. 단일보다 기준선 방향과 함께 봅니다.",
  },
  ichi_kumo_twist: {
    title: "구름 색 전환(비틀림)",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_twist.description,
    howToFind:
      "선행스팬1이 2를 상향 돌파하면 음운→양운, 하향이면 양운→음운. 구름이 두꺼울수록 전환 의미가 큽니다.",
    ...BREAK,
    higher: "양운 전환 → 중장기 상승 우위.",
    lower: "음운 전환 → 중장기 하락 우위.",
    worksWith:
      "현재 가격 vs 구름, TK 교차, MACD 0선. 미래 구름만 바뀌고 가격이 반대면 신중히.",
    tip: "구름 색 전환은 미래 구간에 그려지므로, 현재 가격과의 위치도 함께 보세요.",
  },
  ichi_price_kumo_break: {
    title: "가격 구름 돌파·이탈",
    summary: ICHIMOKU_STRATEGY_META.ichi_price_kumo_break.description,
    howToFind:
      "종가가 구름 상단(두 선행스팬 중 위)을 위로 마감하면 상승 돌파, 하단을 아래로 마감하면 하락 이탈입니다.",
    ...BREAK,
    higher: "구름 상단 돌파 → 저항 해제·상승 공간 개방.",
    lower: "구름 하단 이탈 → 지지 상실·하락 공간 개방.",
    worksWith:
      "거래량, 추세선, RSI/스토캐(돌파 후 과열이 아닌지). 두꺼운 구름 + 거래량이면 신뢰↑.",
    tip: "얇은 구름 돌파는 가짜가 잦고, 두꺼운 구름 돌파는 힘이 큰 편입니다.",
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
      "이미 일목 내부 신호를 묶은 전략입니다. 거래량·상위 타임프레임만 더하면 충분합니다.",
    tip: "신호는 드물지만 교재식 ‘풀세트’ 확인용입니다. 하나둘만 있어도 방향 힌트는 됩니다.",
  },
  ichi_breakout: {
    title: "일목 돌파 매매",
    summary: ICHIMOKU_STRATEGY_META.ichi_breakout.description,
    howToFind:
      "후행스팬이 강하게 캔들을 돌파한 뒤, 장대 양·음봉으로 구름을 돌파하는 봉을 찾습니다. 추세선과 겹치면 신뢰↑.",
    ...BREAK,
    higher: "후행 상향 + 장대양봉 구름 상단 돌파 → 롱. 손절은 최근 박스 하단 참고.",
    lower: "후행 하향 + 장대음봉 구름 하단 이탈 → 숏. 손절은 박스 상단 참고.",
    worksWith:
      "동적 추세선, 거래량, MACD. 일목 단독보다 추세선·거래량과 같이 쓰면 도움이 됩니다.",
    tip: "일목 단독보다 추세선·거래량과 함께 쓰면 승률에 도움이 됩니다.",
  },
  ichi_kumo_sr: {
    title: "구름 지지·저항",
    summary: ICHIMOKU_STRATEGY_META.ichi_kumo_sr.description,
    howToFind:
      "양운 하단(수평)에서 지지받으며 양봉 → 전환선 상향 돌파 시 롱. 음운 상단 저항·음봉 → 전환선 하향 이탈 시 숏.",
    ...BREAK,
    higher: "양운 지지 + 전환선 상향 → 롱. 손절은 양운 하단 아래.",
    lower: "음운 저항 + 전환선 하향 → 숏. 손절은 음운 상단 위.",
    worksWith:
      "수평 지지·저항·피보나치(구름 가장자리와 겹침), 스토캐/RSI 과매도·과매수 탈출.",
    tip: "구름이 두껍고 선행스팬2가 평평할수록 지지·저항이 잘 먹는 편입니다.",
  },
};

export function ichimokuStrategyHelp(id: IchimokuStrategyId): HelpContent {
  return ICHIMOKU_STRATEGY_HELP[id];
}
