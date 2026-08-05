import type { HelpContent } from "./indicatorHelp";
import type { VolumeStrategyId } from "./volumeStrategyMeta";
import { VOLUME_STRATEGY_META } from "./volumeStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const VOLUME_STRATEGY_HELP: Record<VolumeStrategyId, HelpContent> = {
  heatmap_volume: {
    title: "히트맵 볼륨",
    summary: VOLUME_STRATEGY_META.heatmap_volume.description,
    howToFind:
      "거래량을 평균(volMA20) 대비 배수로 나눕니다. Extra High≥3, High≥1.5, Medium≥0.5. SAR 플립 + EMA60 방향 + 중간↑ 거래량일 때 마커. 평균 아래(약한 색)는 피합니다 — 교재식 «평균 대비» 확인의 규칙화입니다.",
    ...BREAK,
    higher: "EMA60 위 + SAR 바이 + 중간↑ 거래량 → 롱.",
    lower: "EMA60 아래 + SAR 셀 + 중간↑ 거래량 → 숏.",
    worksWith:
      "S/R·ADX·SMA20(companion). 가격↑+거래량↑ / 가격↓+거래량↑ 강화와 맞습니다.",
    tip: "저거래량 돌파는 가짜 후보. 노랑↑(평균 근처·이상)에서만 보세요.",
  },
  volume_fight: {
    title: "볼륨 파이트",
    summary: VOLUME_STRATEGY_META.volume_fight.description,
    howToFind:
      "양봉 vol=매수·음봉 vol=매도로 최근 순압력. 영선 위 녹색=매수 우위, 아래 빨강=매도. SAR+EMA60과 방향이 같을 때 마커. 가격은 오르는데 fight가 약하면 상승 약화(교재 반전 후보)로 읽으세요.",
    ...BREAK,
    higher: "EMA60 위 + SAR 바이 + 영선 위 녹색 → 롱만.",
    lower: "EMA60 아래 + SAR 셀 + 영선 아래 빨강 → 숏만.",
    worksWith: "히트맵·VSA·ADX·S/R. 회색 중립은 매매 보류.",
    tip: "필터에 가깝습니다. 가격·거래량 동반 여부를 companion으로 확인하세요.",
  },
  vsa: {
    title: "VSA (Volume Spread Analysis)",
    summary: VOLUME_STRATEGY_META.vsa.description,
    howToFind:
      "vol > volMA20 이고 히트맵 high+일 때, EMA60+SAR 동방향이면 마커. 평균 이상·강한 거래량 = 진짜 참여(교재 Right Breakout 감각).",
    ...BREAK,
    higher: "EMA60 위 + SAR 바이 + 평균↑·강한 거래량 → 롱.",
    lower: "EMA60 아래 + SAR 셀 + 평균↑·강한 거래량 → 숏.",
    worksWith: "히트맵·파이트·캔들 꼬리·S/R. 가격↓+거래량↑만으로 매수하지 마세요.",
    tip: "heatmap보다 거래량 조건이 빡셉니다. 스프레드(봉 폭)·마감도 같이 보세요.",
  },
  vwap_pullback: {
    title: "VWAP 눌림목",
    summary: VOLUME_STRATEGY_META.vwap_pullback.description,
    howToFind:
      "VWAP 중심선(파랑)과 기울기를 봅니다. 롱: VWAP 우상향 + 최근 고·저점이 높아지는 상승 구조에서 가격이 VWAP까지 눌린 뒤 양봉·망치형으로 반등. 숏: VWAP 우하향 + 고·저점 낮아지는 하락 구조에서 VWAP까지 반등 후 음봉 저항. 사이드바에서 VWAP 오버레이를 켜 두세요.",
    ...BREAK,
    higher:
      "VWAP 지지 반등 → 롱. 손절은 VWAP 아래, 목표는 손익비 1:2.",
    lower:
      "VWAP 저항 이탈 → 숏. 손절은 VWAP 위, 목표는 손익비 1:2.",
    worksWith:
      "VWAP 밴드·스위칭, 캔들 패턴(망치/음봉), 지지·저항. 유동성 풍부한 종목에 유리합니다.",
    tip: "일·주·월봉 누적 VWAP 눌림목용 마커입니다. 데이터 앞부분(VWAP 초기 구간)은 노이즈가 큽니다.",
  },
  vwap_band_reversal: {
    title: "VWAP 밴드 반전",
    summary: VOLUME_STRATEGY_META.vwap_band_reversal.description,
    howToFind:
      "상단 밴드(기본 ×2·×3)는 과매수, 하단은 과매도 영역입니다. 숏: 고가가 상단 밴드에 닿고 음봉 마감. 롱: 저가가 하단 밴드에 닿고 양봉 마감. 가격이 밴드에 붙어 달리는 강한 추세·VWAP 초반 구간은 피합니다(횡보에서 승률↑).",
    ...BREAK,
    higher:
      "하단 밴드 터치 + 양봉 → 롱. 손절은 하단 밴드 아래, 1차 목표는 중심선.",
    lower:
      "상단 밴드 터치 + 음봉 → 숏. 손절은 상단 밴드 위, 1차 목표는 중심선.",
    worksWith:
      "VWAP 눌림목(추세형)과 구분해서 쓰세요. ADX 낮은 횡보·박스권에서 더 잘 맞습니다.",
    tip: "설정에서 stdDev1=2, stdDev2=3이 커리큘럼 기본입니다. 밴드 폭을 줄이면 신호가 잦아집니다.",
  },
  vwap_switching: {
    title: "VWAP 스위칭",
    summary: VOLUME_STRATEGY_META.vwap_switching.description,
    howToFind:
      "가격 방향과 VWAP 기울기가 어긋날 때 ‘스위칭’입니다. 숏: 가격은 오르는데 VWAP는 하락 → 이후 가격이 VWAP(저항) 근처에서 꺾일 때. 롱: 가격은 내리는데 VWAP는 상승 → VWAP 아래에서 반등 캔들. 마커는 어긋남이 확인된 봉에 찍힙니다.",
    ...BREAK,
    higher:
      "가격↓ + VWAP↑ 스위칭 후 반등 → 롱. 손절 VWAP 아래, 목표 손익비 1:3.",
    lower:
      "가격↑ + VWAP↓ 스위칭 후 저항 → 숏. 손절 VWAP 위, 목표 손익비 1:3.",
    worksWith:
      "VWAP 중심선·밴드, 과거 고·저점 저항/지지. 어긋남이 해소되면(가격이 VWAP 방향에 합류) 신호 효력이 약해집니다.",
    tip: "가격과 VWAP가 같이 움직일 때는 쓰지 마세요. ‘반대로 움직일 때’만의 기회입니다.",
  },
  vwap_ema_squeeze: {
    title: "VWAP·EMA 스키즈",
    summary: VOLUME_STRATEGY_META.vwap_ema_squeeze.description,
    howToFind:
      "VWAP와 EMA12 이격(%)이 좁아진(스키즈) 뒤, EMA가 VWAP를 상향 돌파(골든)·하향 돌파(데드)하는 봉을 봅니다. 롱은 VWAP 우상향 + 종가≥VWAP, 숏은 우하향 + 종가≤VWAP. 이미 이격이 크게 벌어진 구간 진입은 제외합니다.",
    ...BREAK,
    higher:
      "스키즈 → 골든 크로스 → 롱. 두 선이 다시 벌어지면 익절 후보.",
    lower:
      "스키즈 → 데드 크로스 → 숏. 벌어진 뒤 재접근은 청산·반전 경계.",
    worksWith: "VWAP 눌림목·포에버 VWAP, ADX(추세 확인), EMA12 오버레이.",
    tip: "스키즈는 ‘폭발 직전’, 이미 벌어진 구간은 ‘늦은 진입’으로 봅니다.",
  },
  vwap_trendline: {
    title: "VWAP·추세선 컨플루언스",
    summary: VOLUME_STRATEGY_META.vwap_trendline.description,
    howToFind:
      "사이드바에서 VWAP과 추세선을 켜세요. 가격이 VWAP 근처이면서 상승 추세선과도 겹치고 양봉·망치로 반등하면 롱. VWAP+하락 추세선 저항에서 음봉·유성형이면 숏.",
    ...BREAK,
    higher: "이중 지지 반등 → 롱. 손절은 직전 저점, VWAP 종가 이탈 2봉이면 익절 후보.",
    lower: "이중 저항 이탈 → 숏. 손절은 직전 고점, 종가 상향 돌파 2봉이면 익절 후보.",
    worksWith: "추세선 V1/V2, VWAP 눌림목, 스윙 HH/HL.",
    tip: "한 선만 닿고 다른 선과 멀면 컨플루언스가 아닙니다.",
  },
  forever_vwap_flip: {
    title: "포에버 VWAP 전환",
    summary: VOLUME_STRATEGY_META.forever_vwap_flip.description,
    howToFind:
      "보조 지표에서 포에버 VWAP을 켜세요. 상승=주황·하락=보라, 기울기 전환 시 다이아몬드(사각형 마커). 전환 봉에 장대 양/음봉이 나오면 그 종가에 롱/숏 마커가 찍힙니다.",
    ...BREAK,
    higher: "주황 다이아몬드 + 장대 양봉 → 롱. 손절은 다이아몬드 바로 아래.",
    lower: "보라 다이아몬드 + 장대 음봉 → 숏·롱 청산. 손절은 다이아몬드 바로 위.",
    worksWith: "포에버 VWAP 앵커드 라인, VWAP·EMA 스키즈, 스윙 구조.",
    tip: "일시적으로 선을 뚫어도 반대 색 다이아몬드가 없으면 추세 유지로 봅니다.",
  },
  failed_breakout_short: {
    title: "실패 돌파 숏",
    summary: VOLUME_STRATEGY_META.failed_breakout_short.description,
    howToFind:
      "저항 재시험이 고점·VWAP을 못 넘고 매도 캔들·장악형 후 저점 이탈 시 숏. 교재의 «저거래량 돌파=가짜»와 잘 맞습니다 — companion으로 평균 대비 거래량을 보세요.",
    ...BREAK,
    higher: "숏 전용. 반대 실패 돌파 롱은 이 id에 없음.",
    lower: "실패 돌파 + 저점 이탈 → 숏.",
    worksWith: "캔들·VWAP·S/R·거래량(평균 아래 돌파면 신뢰↑).",
    tip: "고점미갱신·VWAP미돌파·매도세가 겹칠 때만.",
  },
  obv_divergence: {
    title: "OBV 다이버전스",
    summary: VOLUME_STRATEGY_META.obv_divergence.description,
    howToFind:
      "가격 HH+OBV LH=하락 다이버전스(가격↑ 속 수급↓ — 교재 «상승+거래량↓ 약화»와 같은 계열). 가격 LL+OBV HL=상승 다이버전스.",
    ...BREAK,
    higher: "가격 LL + OBV HL → 롱 후보.",
    lower: "가격 HH + OBV LH → 숏·익절 후보.",
    worksWith: "원시 거래량 패널·S/R·ADX·켈트너. 절대 OBV 수치보다 방향.",
    tip: "가격만 오르고 거래량·OBV가 안 따라오면 신규 롱을 줄이세요.",
  },
  obv_keltner: {
    title: "OBV + 켈트너 채널",
    summary: VOLUME_STRATEGY_META.obv_keltner.description,
    howToFind:
      "켈트너(EMA 중심 + ATR 밴드)를 켜고 OBV 패널을 함께 보세요. 롱: 종가가 상단 돌파 + OBV 우상향. 손절 참고=중심선 아래. OBV 하락 다이버전스가 나오기 전까지 홀딩. 숏: 하단 이탈 + OBV 우하향. 손절=중심선 위. 가격이 중심선 상향 복귀+OBV 상승 시 숏 익절.",
    ...BREAK,
    higher: "켈트너 상단 돌파 + OBV↑ → 롱.",
    lower: "켈트너 하단 이탈 + OBV↓ → 숏.",
    worksWith:
      "OBV 다이버전스(익절), 패스트 OBV 추력(더 빠른 진입), ADX. 볼린저보다 밴드가 완만해 돌파 노이즈가 적습니다.",
    tip: "켈트너만 쓰면 신호가 늦을 수 있습니다. OBV로 ‘진짜 돌파’인지 확인하세요.",
  },
  obv_fast_thrust: {
    title: "패스트 OBV 추력",
    summary: VOLUME_STRATEGY_META.obv_fast_thrust.description,
    howToFind:
      "상용 Fast OBV(3D 박스)의 근사입니다. OBV 에너지(단기 기울기 강도 %)가 높고, OBV가 시그널선 위(롱)/아래(숏)일 때 최근 N봉 고·저 돌파 양·음봉에 마커가 찍힙니다. 회색(관망)에 해당하는 약한 에너지는 건너뜁니다. 켈트너 상단 돌파보다 이른 타점을 노립니다.",
    ...BREAK,
    higher:
      "에너지↑ + OBV>시그널 + 최근 고점 돌파 양봉 → 롱. 손절은 최근 저점, 목표는 손익비 ≥1:2.",
    lower:
      "에너지↑ + OBV<시그널 + 최근 저점 이탈 음봉 → 숏. 손절은 최근 고점.",
    worksWith:
      "OBV 패널(시그널선·에너지), 켈트너(늦은 확인), 지지·저항. 관망(약한 에너지) 구간은 진입하지 마세요.",
    tip: "TradingView 유료 Fast OBV 박스와 동일하지 않습니다. OBV 모멘텀+돌파로 빠른 타점을 흉내 낸 전략입니다.",
  },
  ad_divergence: {
    title: "A/D 다이버전스",
    summary: VOLUME_STRATEGY_META.ad_divergence.description,
    howToFind:
      "A/D는 종가가 당일 고·저 어디에 있는지×거래량을 누적합니다. OBV(전일 종가 비교)보다 일중 매집/분산이 세밀합니다. 가격 스윙과 A/D 스윙 다이버전스를 봅니다.",
    ...BREAK,
    higher: "가격 LL + A/D HL → 매집·롱 후보.",
    lower: "가격 HH + A/D LH → 분산·숏/익절 후보.",
    worksWith: "Chaikin 오실레이터, OBV 다이버전스, 상투·바닥 구간.",
    tip: "상투·바닥에서 A/D가 가격보다 먼저 꺾이면 반전 가능성이 큽니다.",
  },
  chaikin_zero: {
    title: "Chaikin 0선",
    summary: VOLUME_STRATEGY_META.chaikin_zero.description,
    howToFind:
      "A/D의 단기 EMA(3)−장기 EMA(10). 0선 상·하향 돌파에 마커. 거래량이 가격에 선행한다는 전제.",
    ...BREAK,
    higher: "0선 상향 돌파 → 매수 모멘텀.",
    lower: "0선 하향 돌파 → 매도 모멘텀.",
    worksWith: "Chaikin 다이버전스, A/D 추세, 가격 돌파.",
    tip: "단독 0선보다 다이버전스·가격 확인과 겹치면 신뢰↑.",
  },
  chaikin_divergence: {
    title: "Chaikin 다이버전스",
    summary: VOLUME_STRATEGY_META.chaikin_divergence.description,
    howToFind:
      "가격 스윙 고·저와 Chaikin 스윙을 비교. 오실레이터라 OBV/A/D 선보다 신호가 빠른 편.",
    ...BREAK,
    higher: "가격 LL + Chaikin HL → 롱 후보.",
    lower: "가격 HH + Chaikin LH → 숏/익절 후보.",
    worksWith: "Chaikin 0선, A/D 다이버전스.",
    tip: "괴리 후 0선 방향이 맞으면 확인 신호로 봅니다.",
  },
  equivolume_oversquare: {
    title: "EquiVolume 뚱보형",
    summary: VOLUME_STRATEGY_META.equivolume_oversquare.description,
    howToFind:
      "EquiVolume 켜면 봉 테두리가 형태별로 칠해집니다(키다리=청, 뚱보=주황). 스윙 고·저의 뚱보형에 마커. 횡축은 여전히 시간이지만, 상자 비율로 Arms식 형태를 근사합니다.",
    ...BREAK,
    higher: "스윙 저점 뚱보형 → 매집·상승 후보.",
    lower: "스윙 고점 뚱보형 → 과다 공급·하락 경계.",
    worksWith: "EOM(이동 용이성), A/D·Chaikin.",
    tip: "진짜 EquiVolume은 거래량으로 횡축 폭을 잡습니다. 여기선 형태 분류+봉 색+비율 패널.",
  },
  eom_zero: {
    title: "EOM 0선",
    summary: VOLUME_STRATEGY_META.eom_zero.description,
    howToFind:
      "Ease of Movement 스무스선이 0을 상·하향 돌파할 때. EquiVolume과 짝으로 쓰면 ‘움직이기 쉬운지’를 숫자로 확인.",
    ...BREAK,
    higher: "0 상향 → 상승 방향 이동 용이.",
    lower: "0 하향 → 하락 방향·이동 곤란.",
    worksWith: "EquiVolume 뚱보/키다리, Chaikin.",
    tip: "키다리형 + EOM↑ = 추세 지속 힌트.",
  },
};

export function volumeStrategyHelp(id: VolumeStrategyId): HelpContent {
  return VOLUME_STRATEGY_HELP[id];
}
