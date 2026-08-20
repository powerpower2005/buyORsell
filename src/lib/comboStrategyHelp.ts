import type { HelpContent } from "./indicatorHelp";
import type { ComboStrategyId } from "./comboStrategyMeta";
import { COMBO_STRATEGY_META } from "./comboStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const COMBO_STRATEGY_HELP: Record<ComboStrategyId, HelpContent> = {
  st_adx: {
    title: "슈퍼트렌드 + ADX (추세 추종)",
    summary: COMBO_STRATEGY_META.st_adx.description,
    howBuilt:
      "슈퍼트렌드=ATR×배수 트레일 손절이 뒤집힌 방향. ADX는 |+DI−(−DI)|의 평균이라 ‘한쪽으로 기울어진 강도’만 봅니다. ADX>25일 때만 뒤집힘을 받아, 횡보에서 손절선이 자주 바뀌는 노이즈를 줄입니다.",
    howToFind:
      "ADX가 25 위인 강한 추세에서만 봅니다. 슈퍼트렌드가 상승(초록·가격 아래)으로 바뀌고 종가가 선 위이면 매수, 하락(빨강·가격 위)으로 바뀌고 종가가 선 아래이면 매도. 횡보(ADX 낮음)에서는 신호가 거의 안 나옵니다.",
    ...LONG_SHORT,
    higher: "ADX>25 + 슈퍼트렌드 상승 전환 + 종가>선 → 매수.",
    lower: "ADX>25 + 슈퍼트렌드 하락 전환 + 종가<선 → 매도/청산.",
    worksWith: "ATR(손절), +DI/−DI 방향, 거래량·이평. ADX만 높고 방향이 어긋나면 관망하세요.",
    bestFor: "뚜렷한 추세가 있는 중·대형주·지수 스윙. 박스·횡보보다는 추세가 확인된 구간에 쓰기 좋습니다.",
    pros: "횡보 노이즈를 크게 줄입니다.",
    cons: "추세 확인 후라 이미 중반인 경우가 많고, 초입은 놓칩니다.",
    tip: "신호가 적을수록(ADX 필터) 노이즈가 줄어듭니다.",
  },
  kc_cci: {
    title: "켈트너 + CCI (돌파·모멘텀)",
    summary: COMBO_STRATEGY_META.kc_cci.description,
    howBuilt:
      "켈트너 밖=평소 ATR보다 더 간 돌파. CCI>+100은 대표가가 통계 평균에서 위로 많이 벗어난 모멘텀. ATR이 최근보다 커진 봉만 받아, 조용한 구간의 가짜 돌파를 걸러 냅니다.",
    howToFind:
      "종가가 켈트너 상단을 뚫고 CCI가 +100을 위로 뚫으면 매수, 하단 이탈 + CCI −100 하향이면 매도. 변동성(ATR)이 최근보다 커진 봉만 진입합니다.",
    ...LONG_SHORT,
    higher: "상단 돌파 + CCI>+100 + ATR 확대 → 매수.",
    lower: "하단 이탈 + CCI<−100 + ATR 확대 → 매도.",
    worksWith: "OBV, ADX, 거래량 히트맵. 켈트너만 쓰면 늦을 수 있어 CCI로 힘을 확인합니다.",
    bestFor: "변동성이 커지기 시작하는 돌파·모멘텀 구간. 좁은 박스에서 억지로 쓰지 마세요.",
    pros: "돌파+모멘텀+변동성 확대를 겹쳐 가짜 돌파를 줄입니다.",
    cons: "조건이 많아 신호가 드물고, 횡보에서는 손실이 쌓이기 쉽습니다.",
    tip: "ATR이 작을 때의 돌파는 가짜가 많으니 필터를 끄지 마세요.",
  },
  vwap_flow: {
    title: "VWAP + MFI + OBV (자금 흐름)",
    summary: COMBO_STRATEGY_META.vwap_flow.description,
    howBuilt:
      "VWAP 위 지지=평균 단가보다 비싸게 지키며 반등. MFI>50은 대표가×거래량 유입이 유출보다 큼. OBV 신고는 상승 마감 거래량이 새 고점을 만든 것입니다. 세 개가 겹치면 가격 지지가 자금으로도 확인된 것으로 봅니다.",
    howToFind:
      "매수: 가격이 VWAP 위에서 지지되며 양봉 반등 + MFI가 50 위에서 상승 + OBV가 최근 고점 갱신. 매도: VWAP 아래 저항 + MFI 50 아래 하락 + OBV 신저. VWAP은 중심, MFI·OBV는 ‘진짜 자금’ 확인입니다.",
    ...LONG_SHORT,
    higher: "VWAP 지지 + MFI>50↑ + OBV 신고 → 매수.",
    lower: "VWAP 저항 + MFI<50↓ + OBV 신저 → 매도.",
    worksWith: "VWAP 밴드·눌림목, 거래량 히트맵, 스윙 고·저.",
    bestFor: "유동성이 큰 대형주·지수 스윙.",
    pros: "가격만의 지지가 아니라 자금 흐름으로 확인합니다.",
    cons: "VWAP 초반·저유동에서는 노이즈가 큽니다.",
    tip: "가격만 VWAP 위이고 MFI·OBV가 약하면 가짜 지지일 수 있습니다.",
  },
  pctb_mean_reversion: {
    title: "%B + CCI + ATR (평균 회귀)",
    summary: COMBO_STRATEGY_META.pctb_mean_reversion.description,
    howBuilt:
      "%B>1은 볼린저 상단 밖(통계적 극단). CCI 과열은 대표가 이격. ATR이 갑자기 안 커지고 ADX<20이면 ‘가속 추세’가 아니라 횡보 이탈이라, 평균(밴드 안)으로 돌아올 확률이 더 크다고 봅니다.",
    howToFind:
      "횡보(추세가 약할 때)에, 가격이 볼린저 바깥까지 과하게 벗어나면 다시 안으로 돌아올 것을 노립니다. 밴드 밖 + CCI 과열 + ATR이 갑자기 안 커짐 + ADX<20일 때만 신호가 납니다. 강한 추세에서는 끄세요.",
    ...LONG_SHORT,
    higher: "밴드 아래 밖 + CCI 침체 + ATR 안정 + ADX<20 → 매수(되돌림).",
    lower: "밴드 위 밖 + CCI 과열 + ATR 안정 + ADX<20 → 매도(되돌림).",
    worksWith: "볼린저 지지·저항, RSI. 추세 추종(슈퍼트렌드+ADX)과 동시에 켜면 신호가 충돌할 수 있습니다.",
    bestFor: "횡보·박스권. 강한 추세·갭 급등락에서는 쓰지 마세요.",
    pros: "과도 이격 되돌림을 규칙화하고, 추세 추종과 역할이 분리됩니다.",
    cons: "강한 추세에서는 밴드 밖이 가속이라 역추세 손실이 큽니다.",
    tip: "ADX≥20이면 이 전략은 꺼 두는 편이 낫습니다.",
  },
  psar_adx: {
    title: "Parabolic SAR + ADX + ATR (전환·추적)",
    summary: COMBO_STRATEGY_META.psar_adx.description,
    howBuilt:
      "SAR 점이 가격 아래로 내려오면 따라오던 하락 손절이 깨져 방향이 뒤집힌 것입니다. ADX>20은 그 뒤집힘이 횡보 휩쏘가 아닐 강도. ATR×2는 평소 진폭의 두 배를 손절 여유로 둡니다.",
    howToFind:
      "ADX>20인 상태에서 SAR 점이 가격 아래로 내려오면 매수, 가격 위로 올라오면 매도. 손절·추적은 SAR 점선 또는 진입가 ± ATR×2를 참고하세요.",
    ...LONG_SHORT,
    higher: "ADX>20 + SAR이 가격 아래 → 매수.",
    lower: "ADX>20 + SAR이 가격 위 → 매도.",
    worksWith: "슈퍼트렌드(같은 방향이면 신뢰↑), ATR, 이평. 횡보에서 SAR은 잦은 전환이 나므로 ADX가 핵심입니다.",
    bestFor: "추세 전환을 빨리 잡고 따라가는 일·주 스윙.",
    pros: "전환 시점과 트레일 손절이 선명합니다.",
    cons: "횡보 휩쏘가 심하고, ADX 없이는 신호가 난무합니다.",
    tip: "ADX가 낮을 때의 SAR 신호는 무시하세요.",
  },
  obv_div_st: {
    title: "OBV 다이버전스 + 슈퍼트렌드 (반전)",
    summary: COMBO_STRATEGY_META.obv_div_st.description,
    howBuilt:
      "가격 LL+OBV HL은 더 싼 저점이어도 상승 마감 거래량은 덜 줄었다는 뜻입니다. 슈퍼트렌드 상승 전환은 ATR 트레일이 그 약해진 매도를 확인한 뒤에야 들어가는 필터입니다.",
    howToFind:
      "주가는 더 낮은 저점인데 OBV 저점은 높아진 뒤 슈퍼트렌드가 상승으로 바뀌면 매수. 주가 고점은 더 높은데 OBV 고점은 낮아진 뒤 슈퍼트렌드가 하락으로 바뀌면 매도. MFI에도 같은 어긋남이 있으면 신뢰↑.",
    ...LONG_SHORT,
    higher: "주가↓·OBV↑ 어긋남 + 슈퍼트렌드 상승 전환 → 매수.",
    lower: "주가↑·OBV↓ 어긋남 + 슈퍼트렌드 하락 전환 → 매도.",
    worksWith: "MFI·RSI·MACD 다이버전스, 지지·저항. 다이버전스만으로 들어가지 말고 슈퍼트렌드 전환을 확인하세요.",
    bestFor: "추세 끝물이 의심될 때 반전·되돌림 포착.",
    pros: "다이버전스의 이른 진입을 슈퍼트렌드 확인으로 줄입니다.",
    cons: "확인을 기다리면 늦고, 강한 추세 한가운데에서는 실패합니다.",
    tip: "다이버전스는 타이밍이 이른 경우가 많아, 슈퍼트렌드 전환을 확인봉으로 씁니다.",
  },
};

export function comboStrategyHelp(id: ComboStrategyId): HelpContent {
  return COMBO_STRATEGY_HELP[id];
}
