import type { HelpContent } from "./indicatorHelp";
import type { RsiStrategyId } from "./rsiStrategyMeta";
import { RSI_STRATEGY_META } from "./rsiStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const RSI_STRATEGY_HELP: Record<RsiStrategyId, HelpContent> = {
  rsi_classic_obos: {
    title: "고전 RSI 과매수·과매도",
    summary: RSI_STRATEGY_META.rsi_classic_obos.description,
    howToFind:
      "RSI가 30 아래에서 다시 위로 올라오면 매수 후보, 70 위에서 다시 아래로 내려오면 매도 후보입니다. 강한 상승·하락장에서는 이 구간이 오래 가서, 반대로 들어가면 실패하기 쉽습니다. 횡보에서만 참고하세요.",
    ...LONG_SHORT,
    higher: "30 아래에서 위로 올라옴 → 너무 내렸다에서 벗어난 반등 후보(매수).",
    lower: "70 위에서 아래로 내려옴 → 너무 올랐다에서 벗어난 조정 후보(매도).",
    worksWith:
      "SMA200·ADX(강한 추세인지), 지지·저항, 거래량. 추세와 반대 신호는 걸러 보세요.",
    pros: "규칙이 단순하고, 과열·침체 구간을 숫자로 보여 줍니다.",
    cons: "고정 70/30은 추세장에서 실패가 잦습니다. 이것만으로 매매하지 마세요.",
    tip: "박스권 참고용입니다. 추세장에서는 슈퍼 RSI·다이버전스+지지저항을 우선하세요.",
  },
  super_rsi_obos: {
    title: "슈퍼 RSI 유동 과매수·과매도",
    summary: RSI_STRATEGY_META.super_rsi_obos.description,
    howToFind:
      "분홍(위)·녹색(아래) 선은 시장에 맞춰 움직이는 ‘너무 올랐다/내렸다’ 기준입니다. 검은 가중 RSI가 위 기준을 뚫고 다시 내려오면 매도, 아래 기준을 뚫고 다시 올라오면 매수입니다.",
    ...LONG_SHORT,
    higher: "아래쪽 유동 기준을 위로 뚫고 나옴 → 매수.",
    lower: "위쪽 유동 기준을 아래로 뚫고 나옴 → 매도.",
    worksWith:
      "지지·저항, 거래량, ADX. 고정 70/30보다 추세에 맞춰 기준이 움직입니다.",
    tip: "고정선보다 덜 이르지만, 횡보·가짜 이탈은 다른 지표로 확인하세요.",
  },
  super_rsi_squeeze_mid: {
    title: "슈퍼 RSI 수렴→중심선 돌파",
    summary: RSI_STRATEGY_META.super_rsi_squeeze_mid.description,
    howToFind:
      "위·아래 유동 기준이 좁아졌다가 다시 벌어질 때, 검은 가중 RSI가 노란 중심선을 위·아래로 뚫는 봉을 찾습니다. 조용하다가 방향이 나는 구간입니다.",
    ...LONG_SHORT,
    higher: "좁아진 뒤 중심선을 위로 뚫음 → 매수.",
    lower: "좁아진 뒤 중심선을 아래로 뚫음 → 매도.",
    worksWith: "거래량, ADX, 볼린저 스퀴즈(가격 쪽에서도 좁아졌는지).",
    tip: "신호는 드물지만, 가격 쪽 변동성 확대와 겹치면 힘이 큰 편입니다.",
  },
  rsi_divergence: {
    title: "RSI 다이버전스",
    summary: RSI_STRATEGY_META.rsi_divergence.description,
    howToFind:
      "주가는 더 낮은 저점인데 RSI 저점은 높아지면 → 매수 후보(상승 다이버전스). 주가는 더 높은 고점인데 RSI 고점은 낮아지면 → 매도 후보(하락 다이버전스). 두 번째 꺾임에 신호가 납니다.",
    ...LONG_SHORT,
    higher: "상승 다이버전스 → 매수·반등 후보.",
    lower: "하락 다이버전스 → 매도·조정 후보.",
    worksWith:
      "지지·저항, 망치/유성 같은 반응 캔들, ADX·거래량, SMA200. 다이버전스만으로 들어가지 마세요.",
    tip: "추세선 돌파나 반응 캔들이 나올 때까지 기다리는 편이 안전합니다.",
  },
  double_rsi_cross: {
    title: "이중 RSI 교차",
    summary: RSI_STRATEGY_META.double_rsi_cross.description,
    howToFind:
      "단기 RSI(7)가 장기 RSI(21)를 아래에서 위로 뚫으면 매수, 위에서 아래로 뚫으면 매도입니다. 교차만 봅니다.",
    ...LONG_SHORT,
    higher: "단기가 장기를 위로 뚫음 → 매수.",
    lower: "단기가 장기를 아래로 뚫음 → 매도.",
    worksWith: "SMA200·ADX(추세 필터), 거래량. 횡보 교차는 걸러 보세요.",
    tip: "추세장에 유리하고, 횡보에서는 손절이 잦을 수 있습니다.",
  },
};

export function rsiStrategyHelp(id: RsiStrategyId): HelpContent {
  return RSI_STRATEGY_HELP[id];
}
