import type { TrendLabel } from "./types";

/** Volume / VWAP / OBV playbooks — keep separate. */
export type VolumeStrategyId =
  | "heatmap_volume"
  | "volume_fight"
  | "vsa"
  | "vwap_pullback"
  | "vwap_band_reversal"
  | "vwap_switching"
  | "vwap_ema_squeeze"
  | "vwap_trendline"
  | "forever_vwap_flip"
  | "failed_breakout_short"
  | "obv_divergence"
  | "obv_keltner"
  | "obv_fast_thrust"
  | "ad_divergence"
  | "chaikin_zero"
  | "chaikin_divergence"
  | "equivolume_oversquare"
  | "eom_zero";

export const VOLUME_STRATEGY_ORDER: VolumeStrategyId[] = [
  "heatmap_volume",
  "volume_fight",
  "vsa",
  "vwap_pullback",
  "vwap_band_reversal",
  "vwap_switching",
  "vwap_ema_squeeze",
  "vwap_trendline",
  "forever_vwap_flip",
  "failed_breakout_short",
  "obv_divergence",
  "obv_keltner",
  "obv_fast_thrust",
  "ad_divergence",
  "chaikin_zero",
  "chaikin_divergence",
  "equivolume_oversquare",
  "eom_zero",
];

export const VOLUME_STRATEGY_META: Record<
  VolumeStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  heatmap_volume: {
    label: "Heatmap Volume",
    labelKo: "히트맵 볼륨",
    description:
      "EMA60 추세 + 파라볼릭 SAR 신호 + 중간 이상 거래량(히트맵)이 겹칠 때만 진입.",
    markerBull: "HV↑",
    markerBear: "HV↓",
    typicalDirection: "neutral",
  },
  volume_fight: {
    label: "Volume Fight",
    labelKo: "볼륨 파이트",
    description:
      "EMA60 추세 + SAR 신호 + 매수/매도 세력 우위(영선 위 녹색 / 아래 빨강) 필터.",
    markerBull: "VF↑",
    markerBear: "VF↓",
    typicalDirection: "neutral",
  },
  vsa: {
    label: "VSA",
    labelKo: "VSA",
    description:
      "EMA60 추세 + SAR + 평균 이상·강한 거래량(노랑/빨강)으로 세력 개입을 확인할 때 진입.",
    markerBull: "VS↑",
    markerBear: "VS↓",
    typicalDirection: "neutral",
  },
  vwap_pullback: {
    label: "VWAP pullback",
    labelKo: "VWAP 눌림목",
    description:
      "VWAP 우상향·상승 구조에서 중심선 지지 반등(롱), 우하향·하락 구조에서 저항 이탈(숏).",
    markerBull: "VP↑",
    markerBear: "VP↓",
    typicalDirection: "neutral",
  },
  vwap_band_reversal: {
    label: "VWAP band reversal",
    labelKo: "VWAP 밴드 반전",
    description:
      "상단 밴드(과매수) 터치 후 음봉→숏, 하단 밴드(과매도) 터치 후 양봉→롱. 횡보에 유리.",
    markerBull: "VB↑",
    markerBear: "VB↓",
    typicalDirection: "neutral",
  },
  vwap_switching: {
    label: "VWAP switching",
    labelKo: "VWAP 스위칭",
    description:
      "가격과 VWAP 기울기가 반대로 움직일 때(스위칭) 이후 VWAP 방향 쪽으로 진입.",
    markerBull: "SW↑",
    markerBear: "SW↓",
    typicalDirection: "neutral",
  },
  vwap_ema_squeeze: {
    label: "VWAP–EMA squeeze",
    labelKo: "VWAP·EMA 스키즈",
    description:
      "VWAP와 EMA12 이격이 좁아진 뒤 골든/데드 크로스 + VWAP 기울기·가격 위치가 맞을 때 진입. 벌어진 뒤 진입은 피함.",
    markerBull: "SQ↑",
    markerBear: "SQ↓",
    typicalDirection: "neutral",
  },
  vwap_trendline: {
    label: "VWAP ∩ trendline",
    labelKo: "VWAP·추세선",
    description:
      "VWAP 지지와 상승 추세선이 겹치면 롱, VWAP 저항과 하락 추세선이 겹치면 숏.",
    markerBull: "VT↑",
    markerBear: "VT↓",
    typicalDirection: "neutral",
  },
  forever_vwap_flip: {
    label: "Forever VWAP flip",
    labelKo: "포에버 VWAP 전환",
    description:
      "포에버 VWAP 기울기 전환(주황/보라 다이아몬드) + 장대 캔들 종가에서 추세 방향으로 진입.",
    markerBull: "◆↑",
    markerBear: "◆↓",
    typicalDirection: "neutral",
  },
  failed_breakout_short: {
    label: "Failed breakout short",
    labelKo: "실패 돌파 숏",
    description:
      "고점 미갱신·VWAP 미돌파·윗꼬리 매도세·하락장형 후 직전 양봉 저점 이탈 시 숏.",
    markerBull: "FB↑",
    markerBear: "FB↓",
    typicalDirection: "bearish",
  },
  obv_divergence: {
    label: "OBV divergence",
    labelKo: "OBV 다이버전스",
    description:
      "가격 HH+OBV LH(하락 다이버전스→숏/익절), 가격 LL+OBV HL(상승 다이버전스→롱).",
    markerBull: "OD↑",
    markerBear: "OD↓",
    typicalDirection: "neutral",
  },
  obv_keltner: {
    label: "OBV + Keltner",
    labelKo: "OBV+켈트너",
    description:
      "켈트너 상단 돌파+OBV 상승→롱, 하단 이탈+OBV 하락→숏. OBV로 돌파의 매수/매도 힘을 확인.",
    markerBull: "OK↑",
    markerBear: "OK↓",
    typicalDirection: "neutral",
  },
  obv_fast_thrust: {
    label: "Fast OBV thrust",
    labelKo: "패스트 OBV 추력",
    description:
      "OBV 에너지(단기 기울기)가 강하고 최근 고·저를 돌파할 때 빠른 타점. 상용 Fast OBV 박스의 근사.",
    markerBull: "OF↑",
    markerBear: "OF↓",
    typicalDirection: "neutral",
  },
  ad_divergence: {
    label: "A/D divergence",
    labelKo: "A/D 다이버전스",
    description:
      "가격 HH+A/D LH(분산→숏/익절), 가격 LL+A/D HL(매집→롱). OBV보다 일중 종가 위치로 세밀.",
    markerBull: "AD↑",
    markerBear: "AD↓",
    typicalDirection: "neutral",
  },
  chaikin_zero: {
    label: "Chaikin zero cross",
    labelKo: "Chaikin 0선",
    description:
      "차이킨 오실레이터가 0선 상향 돌파→매수 모멘텀, 하향 돌파→매도 모멘텀.",
    markerBull: "CZ↑",
    markerBear: "CZ↓",
    typicalDirection: "neutral",
  },
  chaikin_divergence: {
    label: "Chaikin divergence",
    labelKo: "Chaikin 다이버전스",
    description:
      "가격 HH+Chaikin LH(하락 다이버전스), 가격 LL+Chaikin HL(상승 다이버전스).",
    markerBull: "CD↑",
    markerBear: "CD↓",
    typicalDirection: "neutral",
  },
  equivolume_oversquare: {
    label: "EquiVolume oversquare",
    labelKo: "EquiVolume 뚱보형",
    description:
      "스윙 고점 뚱보형=과다 공급·하락 경계, 스윙 저점 뚱보형=매집·상승 후보. EquiVolume+EOM과 함께.",
    markerBull: "EQ↑",
    markerBear: "EQ↓",
    typicalDirection: "neutral",
  },
  eom_zero: {
    label: "EOM zero cross",
    labelKo: "EOM 0선",
    description:
      "Ease of Movement 스무스선이 0 상향→이동 용이(상승 힘), 하향→이동 곤란/하락 힘.",
    markerBull: "EM↑",
    markerBear: "EM↓",
    typicalDirection: "neutral",
  },
};
