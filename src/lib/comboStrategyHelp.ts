import type { HelpContent } from "./indicatorHelp";
import type { ComboStrategyId } from "./comboStrategyMeta";
import { COMBO_STRATEGY_META } from "./comboStrategyMeta";

const BREAK = { higherLabel: "롱 조건", lowerLabel: "숏 조건" } as const;

export const COMBO_STRATEGY_HELP: Record<ComboStrategyId, HelpContent> = {
  st_adx: {
    title: "슈퍼트렌드 + ADX (추세 추종)",
    summary: COMBO_STRATEGY_META.st_adx.description,
    howToFind:
      "ADX가 25 위인 강한 추세에서만 봅니다. 슈퍼트렌드가 상승(초록·가격 아래)으로 바뀌고 종가가 선 위이면 롱, 하락(빨강·가격 위)으로 바뀌고 종가가 선 아래이면 숏. 손절은 슈퍼트렌드 라인 또는 ATR×1.5~2를 참고하세요.",
    ...BREAK,
    higher:
      "ADX>25 + 슈퍼트렌드 상승 전환 + 종가>ST → 롱. 횡보(ADX 낮음)에서는 신호가 거의 안 나옵니다.",
    lower:
      "ADX>25 + 슈퍼트렌드 하락 전환 + 종가<ST → 숏/청산.",
    worksWith:
      "ATR(손절·포지션 크기), +DI/−DI 방향, 거래량·이평. ADX만 높고 DI가 어긋나면 관망하세요.",
    bestFor:
      "뚜렷한 추세가 있는 중·대형주·지수·코인 스윙. 박스·횡보·뉴스 급변 직후보다는 ‘이미 추세가 확인된’ 구간에 쓰기 좋습니다.",
    pros:
      "다우 ‘추세는 전환 확인까지 지속’을 ADX+슈퍼트렌드로 규칙화합니다. 횡보 노이즈를 크게 줄입니다.",
    cons:
      "추세 확인 후라 이평 골든처럼 이미 중반인 경우가 많고, 전환 초입(1파)은 놓칩니다. ADX 임계·국면 판단은 주관적입니다.",
    tip: "가장 인기 있는 추세 추종 조합입니다. 신호가 적을수록(ADX 필터) 노이즈가 줄어듭니다.",
  },
  kc_cci: {
    title: "켈트너 + CCI (돌파·모멘텀)",
    summary: COMBO_STRATEGY_META.kc_cci.description,
    howToFind:
      "종가가 켈트너 상단을 돌파하고 CCI가 +100을 상향 돌파하면 롱, 하단 이탈 + CCI −100 하향이면 숏. ATR이 최근 평균보다 커진(변동성 확대) 봉만 진입합니다. 청산은 반대 채널 터치 또는 CCI 0선 회귀를 참고하세요.",
    ...BREAK,
    higher: "상단 돌파 + CCI>+100 + ATR 확대 → 롱.",
    lower: "하단 이탈 + CCI<−100 + ATR 확대 → 숏.",
    worksWith:
      "OBV(돌파 힘), ADX(추세 지속), 거래량 히트맵. 켈트너만 쓰면 늦을 수 있어 CCI로 모멘텀을 확인합니다.",
    bestFor:
      "실적·테마·변동성 확대 직후의 돌파 매매, 선물·코인·모멘텀 강한 종목. 좁은 박스에서 억지로 쓰기보다 ‘밴드가 벌어지기 시작할 때’가 맞습니다.",
    pros:
      "돌파+모멘텀+변동성 확대를 겹쳐 가짜 돌파를 줄입니다. 엘리어트 3파식 가속 구간과 잘 맞습니다.",
    cons:
      "후행·헤드페이크가 남고, 횡보에서는 손실이 쌓이기 쉽습니다. 조건이 많아 신호가 드뭅니다.",
    tip: "ATR이 평균보다 작을 때의 돌파는 헤드페이크가 많으니 필터를 끄지 마세요.",
  },
  vwap_flow: {
    title: "VWAP + MFI + OBV (자금 흐름)",
    summary: COMBO_STRATEGY_META.vwap_flow.description,
    howToFind:
      "롱: 가격이 VWAP 위에서 지지(저점이 VWAP 근처·양봉 반등) + MFI가 50 위에서 상승 + OBV가 최근 고점을 갱신. 숏: VWAP 아래 저항 + MFI 50 아래 하락 + OBV 신저. VWAP을 중심선, MFI·OBV를 ‘진짜 자금’ 확인으로 보세요.",
    ...BREAK,
    higher: "VWAP 지지 + MFI>50↑ + OBV 신고 → 롱.",
    lower: "VWAP 저항 + MFI<50↓ + OBV 신저 → 숏.",
    worksWith:
      "VWAP 밴드·눌림목 전략, 거래량 히트맵, 스윙 고·저. 유동성이 얇은 종목은 VWAP 노이즈가 큽니다.",
    bestFor:
      "대형주·지수 일·주·월 스윙. 기관·스마트머니 흐름을 따라가는 용도. VWAP 초기 구간은 신호를 가볍게 보세요.",
    pros:
      "가격만의 지지가 아니라 자금(MFI·OBV)으로 다우식 거래량 확인을 강화합니다.",
    cons:
      "VWAP 초반·저유동에서 노이즈가 크고, 지표 조합 해석이 주관적입니다.",
    tip: "가격만 VWAP 위이고 MFI·OBV가 약하면 ‘가짜 지지’일 수 있습니다.",
  },
  pctb_mean_reversion: {
    title: "%B + CCI + ATR (평균 회귀)",
    summary: COMBO_STRATEGY_META.pctb_mean_reversion.description,
    howToFind:
      "숏 후보: %B≥1(상단 밖) + CCI≥+100. 롱 후보: %B≤0(하단 밖) + CCI≤−100. ATR이 갑자기 커지지 않고(급등·급락 아님) ADX<20(약한 추세·횡보)일 때만 마커가 찍힙니다. 이평론의 ‘가격이 이평에서 과도 이격이면 되돌림’과 같은 발상입니다.",
    ...BREAK,
    higher: "%B≤0 + CCI≤−100 + ATR 안정 + ADX<20 → 롱(되돌림).",
    lower: "%B≥1 + CCI≥+100 + ATR 안정 + ADX<20 → 숏(되돌림).",
    worksWith:
      "볼린저 밴드 지지·저항, RSI 과열, 박스 고·저. 추세 추종(슈퍼트렌드+ADX)과 동시에 켜면 신호가 충돌할 수 있습니다.",
    bestFor:
      "횡보·박스권, 변동성이 크지 않은 구간에서의 과열 되돌림. 강한 추세장·갭 급등락에서는 쓰지 마세요(손실이 커질 수 있음).",
    pros:
      "보합·이평 밀착 뒤 이탈이 아닌, 과도 이격 되돌림을 규칙화합니다. 추세 추종과 역할이 분리됩니다.",
    cons:
      "강한 추세(3파)에서는 밴드 밖이 가속이라 역추세 손실이 큽니다. ADX 필터를 끄면 위험합니다.",
    tip: "ADX≥20이면 추세 쪽으로 힘이 있으니 이 전략은 꺼 두는 편이 낫습니다.",
  },
  psar_adx: {
    title: "Parabolic SAR + ADX + ATR (전환·추적)",
    summary: COMBO_STRATEGY_META.psar_adx.description,
    howToFind:
      "ADX>20인 상태에서 SAR이 가격 아래로 내려오면(바이 플립) 롱, 가격 위로 올라오면(셀 플립) 숏. 손절·추적은 진입가 ± ATR×2 또는 SAR 점선을 따라가세요. 신호가 시각적으로 매우 명확합니다.",
    ...BREAK,
    higher: "ADX>20 + SAR 바이 플립(가격 아래) → 롱.",
    lower: "ADX>20 + SAR 셀 플립(가격 위) → 숏.",
    worksWith:
      "슈퍼트렌드(같은 방향이면 신뢰↑), ATR(포지션·스탑), 이평. 횡보에서 SAR은 잦은 플립이 나므로 ADX 필터가 핵심입니다.",
    bestFor:
      "추세 전환을 빨리 잡고 트레일링으로 수익을 끌고 가는 일·주 스윙. 차트에서 SAR 점만으로도 방향을 읽기 쉬운 종목에 좋습니다.",
    pros:
      "전환 시점과 트레일 손절이 선명합니다. 다우 추세 추종을 시각적으로 단순화합니다.",
    cons:
      "횡보 휩쏘가 심하고(이평 단기선과 유사), ADX 없이는 신호가 난무합니다. 후행·중반 진입이 흔합니다.",
    tip: "ADX가 낮을 때의 SAR 신호는 무시하세요. 그게 이 전략의 핵심 필터입니다.",
  },
  obv_div_st: {
    title: "OBV 다이버전스 + 슈퍼트렌드 (반전)",
    summary: COMBO_STRATEGY_META.obv_div_st.description,
    howToFind:
      "상승 다이버전스: 가격 저점↓·OBV 저점↑ 후 슈퍼트렌드가 상승 전환 → 롱. 하락 다이버전스: 가격 고점↑·OBV 고점↓ 후 슈퍼트렌드 하락 전환 → 숏. MFI에서도 같은 다이버전스가 보이면 요약에 ‘MFI 확인’이 붙고 신뢰도가 올라갑니다.",
    ...BREAK,
    higher: "가격 LL + OBV HL + ST 상승 전환 → 롱.",
    lower: "가격 HH + OBV LH + ST 하락 전환 → 숏.",
    worksWith:
      "MFI 다이버전스, RSI/MACD 다이버전스, 지지·저항. 다이버전스만으로 들어가지 말고 ST 전환을 확인하세요.",
    bestFor:
      "추세가 길어져 ‘끝물’이 의심될 때, 반전·되돌림 포착. 강한 일방향 추세 한가운데보다는 스윙 고·저가 뚜렷한 구간에 쓰기 좋습니다.",
    pros:
      "다우 거래량(OBV)+추세 전환 확인을 묶어, 다이버전스만의 이른 진입을 줄입니다. 5파 말기 감각과 맞습니다.",
    cons:
      "다이버전스·스윙이 주관적이고, ST 확인을 기다리면 후행입니다. 강한 추세 한가운데에서는 실패합니다.",
    tip: "다이버전스는 타이밍이 이른 경우가 많아, 슈퍼트렌드 전환을 ‘확인봉’으로 쓰는 구조입니다.",
  },
};

export function comboStrategyHelp(id: ComboStrategyId): HelpContent {
  return COMBO_STRATEGY_HELP[id];
}
