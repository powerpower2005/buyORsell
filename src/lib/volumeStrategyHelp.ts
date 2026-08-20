import type { HelpContent } from "./indicatorHelp";
import type { VolumeStrategyId } from "./volumeStrategyMeta";
import { VOLUME_STRATEGY_META } from "./volumeStrategyMeta";

const LONG_SHORT = { higherLabel: "롱일 때", lowerLabel: "숏일 때" } as const;

export const VOLUME_STRATEGY_HELP: Record<VolumeStrategyId, HelpContent> = {
  heatmap_volume: {
    title: "히트맵 볼륨",
    summary: VOLUME_STRATEGY_META.heatmap_volume.description,
    howBuilt:
      "히트맵 색=당일 거래량 ÷ 20봉 평균. 0.5×부터 medium, 1.5× high, 3× extra_high. 평균보다 많이 체결됐다는 것은 ‘평소보다 많은 사람이 그 방향에 동의’했다는 뜻입니다. 전략은 그 중간 이상 거래량에, 60일 EMA 위/아래와 SAR 전환이 같은 방향일 때만 신호를 냅니다.",
    howToFind:
      "거래량이 최근 평균보다 어느 정도인지 색으로 나눕니다. 중간 이상 거래량 + 60일 이평 방향 + 파라볼릭 SAR 방향이 같을 때만 신호가 납니다. 평균보다 약한 거래량은 피하세요.",
    ...LONG_SHORT,
    higher: "60일선 위 + SAR 매수 + 중간↑ 거래량 → 매수.",
    lower: "60일선 아래 + SAR 매도 + 중간↑ 거래량 → 매도.",
    worksWith: "지지·저항, ADX, SMA20. 가격과 거래량이 같이 움직일 때 더 믿을 만합니다.",
    tip: "거래량 없는 돌파는 가짜 후보입니다. 평균 근처·이상에서만 보세요.",
  },
  volume_fight: {
    title: "볼륨 파이트",
    summary: VOLUME_STRATEGY_META.volume_fight.description,
    howBuilt:
      "양봉 거래량은 +, 음봉 거래량은 −로 두고 최근 14봉을 합칩니다. 파이트=합/절댓값합 → −1~+1. +면 그 구간에 실린 거래량이 상승 마감 쪽에 더 많다는 뜻입니다. ±0.05 안은 중립(회색). 전략은 이 우위가 EMA60·SAR과 같을 때만 진입합니다.",
    howToFind:
      "양봉 거래량은 매수, 음봉 거래량은 매도로 보고 최근 우위를 그립니다. 0선 위 녹색=매수 우위, 아래 빨강=매도 우위. SAR·60일선과 방향이 같을 때만 신호입니다.",
    ...LONG_SHORT,
    higher: "60일선 위 + SAR 매수 + 매수 우위(녹색) → 매수.",
    lower: "60일선 아래 + SAR 매도 + 매도 우위(빨강) → 매도.",
    worksWith: "히트맵, VSA, ADX, 지지·저항. 회색(중립)이면 관망하세요.",
    tip: "필터에 가깝습니다. 가격만 오르고 매수 우위가 약하면 상승이 약해질 수 있습니다.",
  },
  vsa: {
    title: "VSA (거래량·스프레드)",
    summary: VOLUME_STRATEGY_META.vsa.description,
    howBuilt:
      "고전 VSA(Wyckoff·Tom Williams)는 거래량=노력, 봉 높이(스프레드)=결과입니다. 노력 큰데 결과가 작으면 누군가 흡수 중, 노력이 결과와 같으면 그 방향이 이긴 것입니다. 이 앱 전략은 봉 스프레드 전체를 읽지 않고, 히트맵 high/extra_high(평균 대비 1.5×·3×) + 거래량>20봉 평균 + EMA60·SAR 동방향으로 ‘참여가 큰 날’만 남깁니다.",
    howToFind:
      "거래량이 평균보다 크고 히트맵이 강한 구간에서, 60일선·SAR 방향이 같으면 신호가 납니다. ‘진짜로 참여가 큰 날’만 보려는 전략입니다.",
    ...LONG_SHORT,
    higher: "60일선 위 + SAR 매수 + 강한 거래량 → 매수.",
    lower: "60일선 아래 + SAR 매도 + 강한 거래량 → 매도.",
    worksWith: "히트맵, 볼륨 파이트, 캔들 꼬리, 지지·저항.",
    tip: "히트맵보다 거래량 조건이 빡셉니다. 봉 폭·종가 위치도 같이 보세요.",
  },
  vwap_pullback: {
    title: "VWAP 눌림목",
    summary: VOLUME_STRATEGY_META.vwap_pullback.description,
    howBuilt:
      "VWAP은 거래량이 실린 평균 단가입니다. 우상향이면 돈이 점점 비싼 가격에 체결 중(매수 우위)이라, 그 선까지 눌렸다가 양봉으로 지키면 ‘평균 단가 지지’로 봅니다. 우하향+저항은 그 반대입니다.",
    howToFind:
      "VWAP(평균 체결가 선)이 우상향이고 고·저점이 높아지는 상승에서, 가격이 VWAP까지 눌린 뒤 양봉·망치로 반등하면 매수. 우하향·하락 구조에서 VWAP까지 반등 후 음봉이면 매도.",
    ...LONG_SHORT,
    higher: "VWAP 지지 반등 → 매수. 손절은 VWAP 아래, 목표는 손익비 약 1:2.",
    lower: "VWAP 저항 → 매도. 손절은 VWAP 위, 목표는 손익비 약 1:2.",
    worksWith: "VWAP 밴드·스위칭, 망치/음봉, 지지·저항. 유동성 큰 종목에 유리합니다.",
    tip: "데이터 앞부분(VWAP이 막 시작되는 구간)은 노이즈가 큽니다.",
  },
  vwap_band_reversal: {
    title: "VWAP 밴드 반전",
    summary: VOLUME_STRATEGY_META.vwap_band_reversal.description,
    howBuilt:
      "밴드는 VWAP에서 얼마나 벗어났는지(표준편차)입니다. 상단 터치 후 음봉은 ‘평균보다 비싸게 체결되던 흐름이 그날 종가로 거부’된 것, 하단+양봉은 그 반대로 봅니다. 추세가 강하면 밴드 밖이 가속일 수 있어 횡보에 더 맞습니다.",
    howToFind:
      "VWAP 위·아래 밴드는 ‘너무 올랐다/내렸다’ 영역입니다. 고가가 상단에 닿고 음봉으로 마감하면 매도, 저가가 하단에 닿고 양봉이면 매수. 강한 추세·VWAP 초반은 피하세요.",
    ...LONG_SHORT,
    higher: "하단 밴드 터치 + 양봉 → 매수. 손절은 하단 아래, 1차 목표는 중심선.",
    lower: "상단 밴드 터치 + 음봉 → 매도. 손절은 상단 위, 1차 목표는 중심선.",
    worksWith: "VWAP 눌림목(추세형)과 구분해서 쓰세요. 횡보·박스에서 더 잘 맞습니다.",
    tip: "밴드에 붙어 달리는 강한 추세에서는 쓰지 마세요.",
  },
  vwap_switching: {
    title: "VWAP 스위칭",
    summary: VOLUME_STRATEGY_META.vwap_switching.description,
    howBuilt:
      "가격 기울기와 VWAP 기울기가 반대로 가면, 체결 평균은 한쪽으로 가는데 마지막 가격은 반대로 간 상태입니다. 이후 VWAP 근처에서 가격이 꺾이면 ‘평균 단가 쪽으로 다시 맞추는’ 움직임으로 봅니다.",
    howToFind:
      "가격과 VWAP 기울기가 반대로 움직일 때(스위칭)입니다. 가격은 오르는데 VWAP는 내려가면, 이후 VWAP 근처에서 꺾일 때 매도. 반대면 매수.",
    ...LONG_SHORT,
    higher: "가격↓ + VWAP↑ 후 반등 → 매수. 손절 VWAP 아래.",
    lower: "가격↑ + VWAP↓ 후 저항 → 매도. 손절 VWAP 위.",
    worksWith: "VWAP 중심선·밴드, 과거 고·저. 어긋남이 해소되면 신호 효력이 약해집니다.",
    tip: "가격과 VWAP가 같이 움직일 때는 쓰지 마세요.",
  },
  vwap_ema_squeeze: {
    title: "VWAP·EMA 스키즈",
    summary: VOLUME_STRATEGY_META.vwap_ema_squeeze.description,
    howBuilt:
      "VWAP(거래량 가중 평균)과 EMA12(최근 종가 가중)가 가까워지면, 단기 가격과 누적 단가가 같아진 압축입니다. 그 뒤 EMA가 VWAP을 위로 뚫으면 최근 종가가 누적 단가를 앞지르기 시작한 것=매수 쪽으로 봅니다.",
    howToFind:
      "VWAP와 EMA12가 가까워진(스키즈) 뒤, EMA가 VWAP를 위로 뚫으면 매수·아래로 뚫으면 매도. 롱은 VWAP 우상향+종가≥VWAP, 숏은 그 반대. 이미 크게 벌어진 뒤 진입은 제외합니다.",
    ...LONG_SHORT,
    higher: "스키즈 → 위로 교차 → 매수. 두 선이 다시 벌어지면 익절 후보.",
    lower: "스키즈 → 아래로 교차 → 매도.",
    worksWith: "VWAP 눌림목, 포에버 VWAP, ADX, EMA12.",
    tip: "스키즈는 ‘폭발 직전’, 이미 벌어진 구간은 ‘늦은 진입’으로 봅니다.",
  },
  vwap_trendline: {
    title: "VWAP·추세선",
    summary: VOLUME_STRATEGY_META.vwap_trendline.description,
    howBuilt:
      "VWAP은 평균 단가, 추세선은 스윙 고·저를 이은 기하 지지/저항입니다. 두 선이 같은 가격대에서 만나면 ‘돈이 모인 평균’과 ‘이미 반응한 구조’가 겹친 것이라 한 선만 닿을 때보다 반등·저항 신뢰가 큽니다.",
    howToFind:
      "VWAP과 추세선을 켜세요. 가격이 VWAP 근처이면서 상승 추세선과도 겹치고 양봉·망치로 반등하면 매수. VWAP+하락 추세선 저항에서 음봉이면 매도.",
    ...LONG_SHORT,
    higher: "이중 지지 반등 → 매수. 손절은 직전 저점.",
    lower: "이중 저항 → 매도. 손절은 직전 고점.",
    worksWith: "추세선, VWAP 눌림목, 스윙 고·저.",
    tip: "한 선만 닿고 다른 선과 멀면 ‘겹침’이 아닙니다.",
  },
  forever_vwap_flip: {
    title: "포에버 VWAP 전환",
    summary: VOLUME_STRATEGY_META.forever_vwap_flip.description,
    howBuilt:
      "누적 VWAP이 N봉 전보다 높아지면 주황, 낮아지면 보라입니다. 부호가 바뀌는 봉이 다이아몬드입니다. 그날 장대 양/음봉이 같이 나오면, 평균 단가 기울기 전환을 가격이 확인한 진입으로 봅니다.",
    howToFind:
      "포에버 VWAP을 켜면 상승=주황, 하락=보라입니다. 기울기가 바뀌는 날(다이아몬드)에 장대 양/음봉이 나오면 그 종가에 매수/매도 신호가 납니다.",
    ...LONG_SHORT,
    higher: "주황 전환 + 장대 양봉 → 매수. 손절은 전환점 바로 아래.",
    lower: "보라 전환 + 장대 음봉 → 매도. 손절은 전환점 바로 위.",
    worksWith: "포에버 VWAP 선, VWAP·EMA 스키즈, 스윙 구조.",
    tip: "선을 잠깐 뚫어도 반대 색 전환이 없으면 추세 유지로 봅니다.",
  },
  failed_breakout_short: {
    title: "실패 돌파 숏",
    summary: VOLUME_STRATEGY_META.failed_breakout_short.description,
    howBuilt:
      "저항을 다시 시험했는데 고점·VWAP을 못 넘으면, 평균 단가 위 매수가 실패했다는 뜻입니다. 윗꼬리 매도세 뒤 직전 저점을 깨면 ‘그 실패를 가격이 확인’한 숏으로 봅니다.",
    howToFind:
      "저항을 다시 시험했는데 고점·VWAP을 못 넘고, 매도 캔들 후 저점이 깨지면 매도입니다. 거래량이 약한 돌파일수록 ‘가짜’ 가능성이 큽니다.",
    ...LONG_SHORT,
    higher: "숏 전용입니다. 반대(실패 돌파 롱)는 이 전략에 없습니다.",
    lower: "실패 돌파 + 저점 이탈 → 매도.",
    worksWith: "캔들, VWAP, 지지·저항, 평균 대비 거래량.",
    tip: "고점 미갱신·VWAP 미돌파·매도세가 겹칠 때만 보세요.",
  },
  obv_divergence: {
    title: "OBV 다이버전스",
    summary: VOLUME_STRATEGY_META.obv_divergence.description,
    howBuilt:
      "OBV는 종가↑면 거래량 가산·종가↓면 감산입니다. 가격 고점은 높아졌는데 OBV 고점은 낮아지면, 새 고점을 만든 날들의 거래량 합이 이전 고점 때보다 적다는 뜻=사는 힘이 약해진 것입니다.",
    howToFind:
      "주가는 더 높은 고점을 찍었는데 OBV 고점은 낮아지면 → 사는 힘이 약해진 신호(매도·익절 후보). 주가는 더 낮은 저점인데 OBV 저점은 높아지면 → 파는 힘이 약해진 신호(매수 후보).",
    ...LONG_SHORT,
    higher: "주가 저점↓ + OBV 저점↑ → 매수 후보.",
    lower: "주가 고점↑ + OBV 고점↓ → 매도·익절 후보.",
    worksWith: "거래량 패널, 지지·저항, ADX, 켈트너. 절대 숫자보다 방향을 보세요.",
    tip: "가격만 오르고 거래량·OBV가 안 따라오면 신규 매수를 줄이세요.",
  },
  obv_keltner: {
    title: "OBV + 켈트너 채널",
    summary: VOLUME_STRATEGY_META.obv_keltner.description,
    howBuilt:
      "켈트너 상단=EMA+ATR×배수, 종가가 그 밖이면 평소 흔들림보다 위로 더 간 돌파입니다. OBV가 같이 우상향이면 상승 마감에 실린 거래량이 쌓여 ‘가짜 돌파’가 아니라는 확인입니다.",
    howToFind:
      "켈트너(이평 중심 + 변동성 밴드)와 OBV를 같이 켭니다. 종가가 상단을 뚫고 OBV가 우상향이면 매수. 하단 이탈 + OBV 우하향이면 매도.",
    ...LONG_SHORT,
    higher: "켈트너 상단 돌파 + OBV↑ → 매수.",
    lower: "켈트너 하단 이탈 + OBV↓ → 매도.",
    worksWith: "OBV 다이버전스, 패스트 OBV, ADX.",
    tip: "켈트너만 쓰면 늦을 수 있습니다. OBV로 ‘진짜 돌파’인지 확인하세요.",
  },
  obv_fast_thrust: {
    title: "패스트 OBV 추력",
    summary: VOLUME_STRATEGY_META.obv_fast_thrust.description,
    howBuilt:
      "에너지=최근 N봉 OBV 변화량을 구간 최댓값으로 나눈 %입니다. 시그널은 OBV의 EMA. 에너지가 크고 OBV가 시그널 위일 때 가격이 최근 고점을 뚫으면, 짧은 구간에 매수 누적이 실린 돌파로 봅니다.",
    howToFind:
      "OBV 단기 기울기(에너지)가 강하고, OBV가 시그널선 위(매수)/아래(매도)일 때 최근 고·저를 뚫는 양·음봉에 신호가 납니다. 에너지가 약한 구간은 건너뜁니다.",
    ...LONG_SHORT,
    higher: "에너지↑ + OBV>시그널 + 최근 고점 돌파 양봉 → 매수. 손절은 최근 저점.",
    lower: "에너지↑ + OBV<시그널 + 최근 저점 이탈 음봉 → 매도. 손절은 최근 고점.",
    worksWith: "OBV 패널, 켈트너, 지지·저항.",
    tip: "약한 에너지(관망) 구간에서는 들어가지 마세요.",
  },
  ad_divergence: {
    title: "A/D 다이버전스",
    summary: VOLUME_STRATEGY_META.ad_divergence.description,
    howBuilt:
      "A/D는 종가가 그날 고·저 어디에 있는지×거래량을 누적합니다. 가격 저점은 낮아졌는데 A/D 저점은 높아지면, 하락 봉이어도 종가가 저가에서 멀리 마감되며 물량이 쌓인 것(매집)입니다. OBV(전일 종가 비교)보다 봉 내부 위치를 봅니다.",
    howToFind:
      "주가와 A/D가 어긋나면(가격은 더 낮은데 A/D는 덜 낮음 등) 전환 후보입니다.",
    ...LONG_SHORT,
    higher: "주가 저점↓ + A/D 저점↑ → 매집·매수 후보.",
    lower: "주가 고점↑ + A/D 고점↓ → 분산·매도/익절 후보.",
    worksWith: "Chaikin, OBV 다이버전스, 상투·바닥 구간.",
    tip: "상투·바닥에서 A/D가 가격보다 먼저 꺾이면 반전 가능성이 큽니다.",
  },
  chaikin_zero: {
    title: "Chaikin 0선",
    summary: VOLUME_STRATEGY_META.chaikin_zero.description,
    howBuilt:
      "A/D = Σ(종가위치×거래량). 종가위치는 고가면 +1, 저가면 −1입니다. 차이킨 = A/D의 3일 EMA − 10일 EMA. 값이 0을 위로 넘으면 단기 매집 속도가 장기보다 커진 것=매수 쪽 가속, 아래로 넘으면 분산 가속입니다. 가격선 교차가 아니라 자금흐름 교차입니다.",
    howToFind:
      "보조 지표에서 Chaikin을 켭니다. 0을 위로 뚫으면 매수, 아래로 뚫으면 매도 모멘텀입니다.",
    ...LONG_SHORT,
    higher: "0선 상향 돌파 → 매수 모멘텀.",
    lower: "0선 하향 돌파 → 매도 모멘텀.",
    worksWith: "Chaikin 다이버전스, A/D 추세, 가격 돌파.",
    tip: "0선만보다 다이버전스·가격 확인과 겹치면 더 믿을 만합니다.",
  },
  chaikin_divergence: {
    title: "Chaikin 다이버전스",
    summary: VOLUME_STRATEGY_META.chaikin_divergence.description,
    howBuilt:
      "가격이 새 고점인데 차이킨 고점이 낮아지면, 오르는 동안 종가가 봉 위쪽에 붙는 매집이 이전 고점 때보다 약해진 것입니다. 저점 반대면 하락 중에도 분산이 줄고 있다는 뜻이라 상승 전환 후보입니다. 오실레이터라 A/D 선보다 어긋남이 빨리 보입니다.",
    howToFind:
      "주가와 Chaikin이 어긋날 때(가격은 더 낮은데 지표는 덜 낮음 등) 전환 후보입니다.",
    ...LONG_SHORT,
    higher: "주가 저점↓ + Chaikin 저점↑ → 매수 후보.",
    lower: "주가 고점↑ + Chaikin 고점↓ → 매도·익절 후보.",
    worksWith: "Chaikin 0선, A/D 다이버전스.",
    tip: "괴리 후 0선 방향이 맞으면 확인 신호로 봅니다.",
  },
  equivolume_oversquare: {
    title: "EquiVolume 뚱보형",
    summary: VOLUME_STRATEGY_META.equivolume_oversquare.description,
    howBuilt:
      "상자 비율=거래량/(고−저). 최근 20봉 중앙값의 약 1.4배면 뚱보(물량 대비 이동이 적음). 고점에서 뚱보면 ‘많이 팔아도 더 못 올린다’=공급, 저점이면 ‘많이 사도 더 못 내린다’=매집으로 읽는 Arms의 관점입니다.",
    howToFind:
      "EquiVolume을 켜면 봉 형태가 색으로 구분됩니다(키다리=가늘고 김, 뚱보=넓고 낮음). 스윙 저점의 뚱보는 매집·상승 후보, 스윙 고점의 뚱보는 과다 공급·하락 경계입니다.",
    ...LONG_SHORT,
    higher: "스윙 저점 뚱보형 → 매집·상승 후보.",
    lower: "스윙 고점 뚱보형 → 과다 공급·하락 경계.",
    worksWith: "EOM(움직이기 쉬운지), A/D·Chaikin.",
    tip: "뚱보만으로 단정하지 말고 EOM·가격 위치와 같이 보세요.",
  },
  eom_zero: {
    title: "EOM 0선",
    summary: VOLUME_STRATEGY_META.eom_zero.description,
    howBuilt:
      "EOM = (오늘 중간가 − 어제 중간가) / (거래량 ÷ 봉 높이). 분모가 작으면 적은 거래량으로 크게 움직인 날(키다리), 크면 물량 대비 이동이 적은 날(뚱보). 스무스선이 0을 위로 뚫으면 위로 움직이기 쉬운 힘이 우세해진 것, 아래로 뚫으면 그 반대입니다.",
    howToFind:
      "Ease of Movement 스무스 선이 0을 위로 뚫으면 상승 쪽이 움직이기 쉽고, 아래로 뚫으면 하락·움직임이 답답해집니다.",
    ...LONG_SHORT,
    higher: "0 상향 → 상승 쪽으로 움직이기 쉬움.",
    lower: "0 하향 → 하락 쪽·움직이기 어려움.",
    worksWith: "EquiVolume 뚱보/키다리, Chaikin.",
    tip: "키다리형 + EOM↑ = 추세 지속 힌트입니다.",
  },
};

export function volumeStrategyHelp(id: VolumeStrategyId): HelpContent {
  return VOLUME_STRATEGY_HELP[id];
}
