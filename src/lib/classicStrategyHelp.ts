import type { HelpContent } from "./indicatorHelp";
import type { ClassicStrategyId } from "./classicStrategyMeta";
import { CLASSIC_STRATEGY_META } from "./classicStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const CLASSIC_STRATEGY_HELP: Record<ClassicStrategyId, HelpContent> = {
  ma_golden_dead: {
    title: "이평 골든·데드",
    summary: CLASSIC_STRATEGY_META.ma_golden_dead.description,
    howBuilt:
      "SMA20·SMA50은 각각 최근 20·50봉 종가의 산술평균입니다. 짧은 평균이 긴 평균을 위로 뚫으면, 아주 최근 가격이 중간 창 평균보다 비싸지기 시작한 것=매수 우위가 중기보다 빨라진 골든크로스입니다. 데드는 그 반대입니다. 교차는 이미 움직인 뒤라 후행입니다.",
    howToFind:
      "단기 이평(SMA20)이 중기 이평(SMA50)을 아래에서 위로 뚫으면 매수(골든), 위에서 아래로 뚫으면 매도(데드). 사이드바에서 SMA 20·50을 켜 두세요.",
    ...LONG_SHORT,
    higher:
      "골든 → 매수 후보. 이미 상승이 꽤 진행된 뒤인 경우가 많아, 전량 추격보다 목표가·손절을 같이 잡으세요.",
    lower:
      "데드 → 매도·청산 후보. 하락이 어느 정도 진행된 확인인 경우가 많습니다.",
    worksWith:
      "거래량, MACD 0선, 스윙 고·저. 이평이 서로 엉킨 횡보에서는 매수를 미루는 편이 낫습니다.",
    pros: "추세 전환을 교차로 객관적으로 확인합니다.",
    cons: "신호가 늦은 편입니다. 횡보 휩쏘·중반 진입이 흔합니다.",
    tip: "골든 직후 전량 추격보다, 정배열이 유지되는지·눌림을 보는 편이 안전합니다.",
  },
  high_52w_break: {
    title: "52주·N봉 고점 돌파",
    summary: CLASSIC_STRATEGY_META.high_52w_break.description,
    howBuilt:
      "직전 N봉(일≈252, 주≈52, 월≈24)의 고점만 보고, 그 창에서 이번 봉은 뺍니다. 종가가 그 고점을 처음 넘으면 ‘그동안 막히던 천장’을 사는 쪽이 봉을 닫은 것=신고가 돌파입니다. 꼬리만 뚫고 종가가 아래면 신호가 없습니다.",
    howToFind:
      "최근 N봉 고점(일봉≈1년, 주봉≈1년, 월봉≈2년 분량)을 종가가 위로 뚫으면 매수 신호가 납니다. 장기 신고가·모멘텀 타이밍용입니다.",
    ...LONG_SHORT,
    higher:
      "N봉 고점 종가 돌파 → 매수 후보. 거래량·ADX·중기 이평을 같이 확인하세요.",
    lower:
      "이 전략은 상향 돌파만 표시합니다. 하향 붕괴는 지지·저항·추세 전략을 보세요.",
    worksWith: "거래량, ADX, SMA50, 지지·저항. 장기 관점은 주봉·월봉을 우선하세요.",
    pros: "신고가 돌파가 객관적입니다.",
    cons: "추격·후행입니다. 회사 펀더멘털은 보지 않습니다. 횡보 박스 상단 휩쏘도 가능합니다.",
    tip: "앱은 차트 타이밍만 다룹니다. 사업·밸류에이션은 직접 판단하세요.",
  },
  sma200_support: {
    title: "SMA200 지지 반등",
    summary: CLASSIC_STRATEGY_META.sma200_support.description,
    howBuilt:
      "SMA200=최근 200봉 종가 평균. 장기 보유자의 대략적 단가입니다. 종가가 그 위인 국면에서 저점이 이평 근처(약 0.5~1%·ATR 여유)로 눌린 뒤 양봉·종가가 선 위면, 장기 평균을 지키며 다시 산 것으로 봅니다. 200봉이 없으면 선을 못 그립니다.",
    howToFind:
      "200일선이 있고 종가가 그 위인 상승 국면에서, 저점이 200일선 근처로 눌린 뒤 양봉·종가가 이평 위면 매수입니다. 봉이 부족해 200일선이 없으면 신호 없음.",
    ...LONG_SHORT,
    higher: "200일선 지지 + 양봉 확인 → 매수. 손절은 이평·저점 아래를 참고.",
    lower: "숏(이평 아래 저항)은 이 전략에서 표시하지 않습니다.",
    worksWith: "거래량, ADX, SMA50, 수평 지지. 장기 관점은 주봉·월봉을 보세요.",
    pros: "장기 추세 필터와 ‘어디에 살지’가 분명합니다.",
    cons: "신호가 늦고, 일봉 200개 미만이면 신호가 없습니다.",
    tip: "장기 홀딩은 주봉·월봉도 같이 보세요.",
  },
  fib_wave_pullback: {
    title: "피보 2·4파 눌림",
    summary: CLASSIC_STRATEGY_META.fib_wave_pullback.description,
    howBuilt:
      "스윙 저→고(또는 고→저) 폭의 38.2~61.8% 구간입니다. 황금비 되돌림(0.618)과 그 보수(0.382)라, 추세가 살아 있으면 전 구간을 다 토해 내지 않고 이 근처에서 멈추는 경우가 많다고 봅니다. 앱은 파동 번호를 세지 않고, 저점이 추진 시작 아래로 깨지면(엘리어트 2파 절대규칙) 그 후보는 버립니다. 구간 안 양봉(하락은 음봉) 확인이 진입입니다.",
    howToFind:
      "한바탕 오른 뒤 가격이 대략 38~62% 되돌린 구간에서 양봉·저점 방어가 나오면 매수. 한바탕 내린 뒤 같은 구간에서 음봉·고점 저항이면 매도. 파동 번호에 집착하지 말고 되돌림 구간으로 보세요.",
    ...LONG_SHORT,
    higher:
      "상승 뒤 38~62% 구간 반등 확인 → 매수. 손절은 추진 시작 저점(그 아래면 무효).",
    lower: "하락 뒤 38~62% 반등 구간에서 저항 확인 → 매도.",
    worksWith: "스윙 구조, 지지·저항, 거래량, RSI. 갠 존과 겹치면 더 좋습니다.",
    pros: "되돌림 폭을 구간으로 잡아 목표가·손절이 비교적 분명합니다.",
    cons: "자동으로 잡은 고·저가 틀릴 수 있습니다. 강한 추세에서는 되돌림이 얕아 신호가 없습니다.",
    tip: "한 숫자에 집착하지 말고 38~62%를 영역으로 보세요.",
  },
  gann_zone: {
    title: "갠 되돌림 존",
    summary: CLASSIC_STRATEGY_META.gann_zone.description,
    howBuilt:
      "1×1 각도=봉당 가격 단위≈그 자리 ATR(시간=가격 균형의 근사). 되돌림 존 RZH≈스윙 폭의 50%, RZL≈33%(갠 1/2·1/3). 피보 38~62와 겹치는 구간입니다. 그 존을 터치한 뒤 양봉이 존 중앙 위로 마감하면 지지, 음봉이 중앙 아래로 마감하면 저항으로 봅니다. 실제 모눈지 45°와는 스케일이 다를 수 있습니다.",
    howToFind:
      "최근 스윙 저·고로 각도선과 되돌림 구간을 잡습니다. 상승 조정 중 구간에서 반등이 확인되면 매수, 하락 조정 중 구간에서 저항이면 매도. 전략을 켜면 차트에 각도선이 같이 그려집니다.",
    ...LONG_SHORT,
    higher: "되돌림 구간에서 지지·양봉 확인 → 매수. 손절은 구간 아래 또는 스윙 저점.",
    lower: "같은 구간에서 저항·음봉 확인 → 매도.",
    worksWith: "피보 눌림(구간 겹침), 지지·저항, 거래량. 고·저 선택이 전부입니다.",
    pros: "피보와 다른 각도로 되돌림 자리를 보여 줍니다.",
    cons: "스케일에 따라 각도가 달라지고, 해석·앵커가 주관적입니다.",
    tip: "한 숫자에 집착하지 말고 구간으로 보세요.",
  },
};

export function classicStrategyHelp(id: ClassicStrategyId): HelpContent {
  return CLASSIC_STRATEGY_HELP[id];
}
