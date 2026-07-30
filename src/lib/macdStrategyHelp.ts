import type { HelpContent } from "./indicatorHelp";
import type { MacdStrategyId } from "./macdStrategyMeta";
import { MACD_STRATEGY_META } from "./macdStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const MACD_STRATEGY_HELP: Record<MacdStrategyId, HelpContent> = {
  macd_signal_cross: {
    title: "시그널 선 크로스",
    summary: MACD_STRATEGY_META.macd_signal_cross.description,
    howToFind:
      "파란 MACD 선이 노란 시그널을 아래에서 위로 뚫으면 골든(롱), 위에서 아래로 뚫으면 데드(숏). 0선 위에서 골든·0선 아래에서 데드면 요약에 ‘0선 확인’이 붙습니다. 이평 골든/데드처럼 실전에서는 이미 추세 중반(5~6부)인 경우가 많아, 교차 직후 전량 추격보다 목표가·손절을 같이 잡으세요.",
    ...BREAK,
    higher: "골든 크로스(+0선 위) → 롱. 손절 참고: MACD가 0선 하향. 익절은 과도 이격·과열을 보며 조절.",
    lower: "데드 크로스(+0선 아래) → 숏. 손절 참고: MACD가 0선 상향.",
    worksWith:
      "Hist 확대, RSI/스토캐(과열 여부), 거래량, 가격 이평 정·역배열. 0선과 반대 방향 교차는 신뢰가 낮아 보수적으로 봅니다.",
    pros:
      "이평 교차보다 Hist로 모멘텀을 같이 볼 수 있고, 0선으로 강·약세 필터가 가능합니다.",
    cons:
      "후행·횡보 휩쏘가 크고, 골든/데드가 ‘전환 초입’이 아니라 중반 확인인 경우가 많습니다. 국면 판단은 주관적입니다.",
    tip: "횡보에서는 교차가 잦아 휩쏘가 많습니다. Hist 확대와 함께 보세요.",
  },
  macd_zero_line: {
    title: "기준선(0선) 매매",
    summary: MACD_STRATEGY_META.macd_zero_line.description,
    howToFind:
      "MACD가 0을 상향/하향 돌파하는 봉, 또는 돌파 뒤 시그널 근처로 되돌아온 눌림·반등 봉을 찾습니다. 이평론의 ‘강세=기준 위 파동, 약세=아래’를 모멘텀 축으로 옮긴 읽기입니다.",
    ...BREAK,
    higher: "0선 상향 또는 상승 추세 눌림(시그널 부근) → 롱.",
    lower: "0선 하향 또는 하락 추세 반등(시그널 부근) → 숏.",
    worksWith:
      "이평·스윙 구조(추세 확인), RSI(과매도/과매수가 아닌지), 거래량(다우 확인). 0선 돌파에 거래량이 붙으면 신뢰↑.",
    pros:
      "추세 필터(0선)와 눌림 재진입을 한 지표에서 봅니다. 다우 ‘추세 지속’·이평 위/아래 파동과 잘 맞습니다.",
    cons:
      "0선 돌파도 후행·횡보 휩쏘가 있고, ‘이미 중반’인 경우가 많습니다. 국면(초·중·말)은 스스로 판단해야 합니다.",
    tip: "0선 위에서 MACD가 오래 버티면 상승 지속, 아래에서 못 올라오면 하락 지속으로 봅니다.",
  },
  macd_rsi_confirm: {
    title: "과매수·과매도 확인 (MACD+RSI)",
    summary: MACD_STRATEGY_META.macd_rsi_confirm.description,
    howToFind:
      "RSI가 30 이하→탈출 후 MACD 골든이면 롱. RSI가 80 이상→이탈 후 MACD 데드이면 숏. 다우·이평의 후행성·‘얼마나 갈지’ 약점을 오실레이터로 보완하는 조합입니다.",
    ...BREAK,
    higher: "과매도 탈출 + MACD 골든 → 롱. 손절은 최근 저점 참고.",
    lower: "과매수 이탈 + MACD 데드 → 숏. 손절은 최근 고점 참고.",
    worksWith:
      "RSI 패널(필수에 가깝음), 지지·저항, 거래량. 이미 RSI+MACD를 묶은 전략이라 위치·거래량만 더하면 됩니다.",
    pros:
      "이평/MACD 교차만의 늦은 진입을 RSI 과열 탈출로 보완합니다. 같은 신호를 두 지표로 확인해 주관성을 조금 줄입니다.",
    cons:
      "강한 추세(엘리어트 3파)에서는 RSI 과매수가 오래가 숏이 이르고, 과매도 롱도 실패하기 쉽습니다. 해석·기준선은 여전히 주관적입니다.",
    tip: "교재는 익절 손익비 2:1을 예시로 둡니다. RSI만으로 진입하지 말고 MACD 확인을 기다립니다.",
  },
  macd_divergence: {
    title: "MACD 다이버전스",
    summary: MACD_STRATEGY_META.macd_divergence.description,
    howToFind:
      "가격 스윙과 MACD 스윙이 어긋난 뒤, MACD·시그널 골든/데드가 나는 봉에 마커가 찍힙니다. 엘리어트 5파 말기·다우 전환 후보에서 자주 거론됩니다.",
    ...BREAK,
    higher: "상승 다이버전스 + 골든 → 롱.",
    lower: "하락 다이버전스 + 데드 → 숏.",
    worksWith:
      "스윙 구조, 거래량, RSI 다이버전스(이중 확인), 지지·저항. 교차 확인 없는 단독 다이버전스는 약합니다.",
    pros:
      "추세 추종만으로는 못 잡는 ‘모멘텀 약화’를 스윙으로 보여 줍니다. 5파·말기 청산 후보에 유용합니다.",
    cons:
      "다이버전스는 이르거나 실패(트랩)가 잦고, 스윙 선택이 주관적입니다. ‘선행’처럼 보여도 확정은 교차·후행입니다.",
    tip: "단독 다이버전스보다 시그널 크로스 확인이 붙은 신호가 더 안정적입니다.",
  },
  macd_trend_break: {
    title: "MACD 돌파 매매",
    summary: MACD_STRATEGY_META.macd_trend_break.description,
    howToFind:
      "가격의 최근 하락(상승) 고점·저점 구조를 깨는 동시에 MACD·시그널이 같은 방향으로 돌파·정렬되는 봉을 찾습니다. 다우 스윙 전환 + 모멘텀 확인입니다.",
    ...BREAK,
    higher: "하락 구조 상향 돌파 + MACD·시그널 상승 정렬 → 롱.",
    lower: "상승 구조 하향 돌파 + MACD·시그널 하락 정렬 → 숏.",
    worksWith:
      "동적 추세선·스윙, 거래량(다우 2차), 일목 구름. 가격·MACD·시그널이 같이 뚫리는지가 핵심입니다.",
    pros:
      "가격 구조(다우)와 모멘텀을 같이 깨야 해서 가짜 돌파를 줄입니다. 추세 전환 확정(b)에 가깝습니다.",
    cons:
      "조건을 겹칠수록 후행·신호 감소. 어느 스윙을 ‘구조’로 볼지가 주관적이고, 목표가·지속 기간은 안 줍니다.",
    tip: "가격만 돌파하고 MACD가 따라오지 않으면 가짜 돌파일 수 있습니다.",
  },
};

export function macdStrategyHelp(id: MacdStrategyId): HelpContent {
  return MACD_STRATEGY_HELP[id];
}
