import type { HelpContent } from "./indicatorHelp";
import type { MacdStrategyId } from "./macdStrategyMeta";
import { MACD_STRATEGY_META } from "./macdStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const MACD_STRATEGY_HELP: Record<MacdStrategyId, HelpContent> = {
  macd_signal_cross: {
    title: "시그널 선 크로스",
    summary: MACD_STRATEGY_META.macd_signal_cross.description,
    howToFind:
      "파란 MACD 선이 노란 시그널을 아래에서 위로 뚫으면 매수, 위에서 아래로 뚫으면 매도입니다. 교차만 봅니다. 0선 위/아래는 참고 표시일 뿐, 진입 조건은 아닙니다.",
    ...LONG_SHORT,
    higher: "MACD가 시그널을 위로 뚫음 → 매수 후보.",
    lower: "MACD가 시그널을 아래로 뚫음 → 매도 후보.",
    worksWith:
      "SMA200(장기 추세), 지지·저항, ADX(횡보 필터), 거래량. 이미 많이 오른 뒤 신호가 나오는 경우가 많습니다.",
    pros: "조건을 최소로 둬 신호를 놓치지 않습니다. 다른 지표로 신뢰도를 올리면 됩니다.",
    cons: "신호가 늦은 편이고, 횡보에서 가짜 교차가 많습니다.",
    tip: "200일선·지지저항을 같이 보세요. 횡보에서는 신호만으로 들어가지 마세요.",
  },
  macd_zero_line: {
    title: "기준선(0선) 매매",
    summary: MACD_STRATEGY_META.macd_zero_line.description,
    howToFind:
      "MACD가 0을 위로 뚫거나, 뚫은 뒤 시그널 근처로 눌렸다가 다시 올라가면 매수. 0을 아래로 뚫거나, 뚫은 뒤 반등했다가 다시 내려가면 매도입니다.",
    ...LONG_SHORT,
    higher: "0선 상향 또는 상승 구간에서 시그널 눌림 후 재상승 → 매수.",
    lower: "0선 하향 또는 하락 구간에서 시그널 반등 후 재하락 → 매도.",
    worksWith: "SMA200, 지지·저항, ADX, 거래량. 장기 상승장에서 0선 하향은 ‘눌림’일 수 있습니다.",
    pros: "추세(0선)와 눌림 재진입을 한 지표에서 봅니다.",
    cons: "0선 돌파도 늦은 편이고 횡보 휩쏘가 있습니다.",
    tip: "SMA200 없이 쓰면 추세와 반대 신호가 많아집니다.",
  },
  macd_rsi_confirm: {
    title: "과매수·과매도 확인 (MACD+RSI)",
    summary: MACD_STRATEGY_META.macd_rsi_confirm.description,
    howToFind:
      "RSI가 너무 내린 구간(30 이하)에서 빠져나온 뒤 MACD가 시그널을 위로 뚫으면 매수. RSI가 너무 오른 구간(80 이상)에서 빠진 뒤 MACD가 아래로 뚫으면 매도입니다.",
    ...LONG_SHORT,
    higher: "너무 내렸다에서 탈출 + MACD 위로 교차 → 매수.",
    lower: "너무 올랐다에서 이탈 + MACD 아래로 교차 → 매도.",
    worksWith: "SMA200, 지지·저항, 거래량. 이미 RSI+MACD를 묶은 전략이라 위치·대세만 더하면 됩니다.",
    tip: "강한 상승에서 ‘너무 올랐다’만 보고 숏하면 이르기 쉽습니다.",
  },
  macd_divergence: {
    title: "MACD 다이버전스",
    summary: MACD_STRATEGY_META.macd_divergence.description,
    howToFind:
      "주가와 MACD가 어긋난 뒤(가격은 더 낮은데 MACD는 덜 낮음 등), MACD·시그널이 교차하는 봉에 신호가 납니다.",
    ...LONG_SHORT,
    higher: "상승 다이버전스 + 위로 교차 → 매수.",
    lower: "하락 다이버전스 + 아래로 교차 → 매도.",
    worksWith: "RSI 다이버전스, 지지·저항, 거래량, SMA200.",
    tip: "다이버전스만보다 시그널 교차 확인이 붙은 신호가 더 안정적입니다.",
  },
  macd_trend_break: {
    title: "MACD 돌파 매매",
    summary: MACD_STRATEGY_META.macd_trend_break.description,
    howToFind:
      "가격이 최근 하락(또는 상승) 고·저 구조를 깨는 동시에, MACD와 시그널도 같은 방향으로 맞춰질 때 신호가 납니다.",
    ...LONG_SHORT,
    higher: "하락 구조 상향 돌파 + MACD·시그널 상승 정렬 → 매수.",
    lower: "상승 구조 하향 돌파 + MACD·시그널 하락 정렬 → 매도.",
    worksWith: "거래량, 지지·저항, ADX, SMA200.",
    tip: "가격만 돌파하고 MACD가 따라오지 않으면 가짜 돌파일 수 있습니다.",
  },
};

export function macdStrategyHelp(id: MacdStrategyId): HelpContent {
  return MACD_STRATEGY_HELP[id];
}
