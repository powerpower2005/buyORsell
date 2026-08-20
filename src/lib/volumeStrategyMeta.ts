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
      "60일 이평선 추세와 파라볼릭 SAR 신호가 맞고, 거래량이 평소보다 많을 때만 진입합니다.",
    markerBull: "HV↑",
    markerBear: "HV↓",
    typicalDirection: "neutral",
  },
  volume_fight: {
    label: "Volume Fight",
    labelKo: "볼륨 파이트",
    description:
      "60일 이평선 추세와 SAR 신호에 더해, 매수·매도 중 누가 더 우세한지(영선 위 녹색·아래 빨강)가 맞을 때 진입합니다.",
    markerBull: "VF↑",
    markerBear: "VF↓",
    typicalDirection: "neutral",
  },
  vsa: {
    label: "VSA",
    labelKo: "VSA",
    description:
      "60일 이평선 추세와 SAR가 맞고, 평소보다 많고 강한 거래량(노랑·빨강)으로 큰손 움직임을 확인할 때 진입합니다.",
    markerBull: "VS↑",
    markerBear: "VS↓",
    typicalDirection: "neutral",
  },
  vwap_pullback: {
    label: "VWAP pullback",
    labelKo: "VWAP 눌림목",
    description:
      "VWAP가 우상향·가격이 올라가는 흐름에서는 중심선 지지 반등에 매수, 우하향·내려가는 흐름에서는 저항 이탈에 매도합니다.",
    markerBull: "VP↑",
    markerBear: "VP↓",
    typicalDirection: "neutral",
  },
  vwap_band_reversal: {
    label: "VWAP band reversal",
    labelKo: "VWAP 밴드 반전",
    description:
      "위쪽 밴드를 건드린 뒤 음봉이면 매도, 아래쪽 밴드를 건드린 뒤 양봉이면 매수합니다. 횡보장에 잘 맞습니다.",
    markerBull: "VB↑",
    markerBear: "VB↓",
    typicalDirection: "neutral",
  },
  vwap_switching: {
    label: "VWAP switching",
    labelKo: "VWAP 스위칭",
    description:
      "가격과 VWAP 기울기가 서로 반대로 움직이다가 다시 맞을 때, VWAP 방향으로 진입합니다.",
    markerBull: "SW↑",
    markerBear: "SW↓",
    typicalDirection: "neutral",
  },
  vwap_ema_squeeze: {
    label: "VWAP–EMA squeeze",
    labelKo: "VWAP·EMA 스키즈",
    description:
      "VWAP와 12일 이평선이 가까워졌다가 다시 교차하고, VWAP 기울기·가격 위치가 맞을 때 진입합니다. 벌어진 뒤에는 피합니다.",
    markerBull: "SQ↑",
    markerBear: "SQ↓",
    typicalDirection: "neutral",
  },
  vwap_trendline: {
    label: "VWAP ∩ trendline",
    labelKo: "VWAP·추세선",
    description:
      "VWAP 지지와 상승 추세선이 겹치면 매수, VWAP 저항과 하락 추세선이 겹치면 매도합니다.",
    markerBull: "VT↑",
    markerBear: "VT↓",
    typicalDirection: "neutral",
  },
  forever_vwap_flip: {
    label: "Forever VWAP flip",
    labelKo: "포에버 VWAP 전환",
    description:
      "포에버 VWAP 기울기가 바뀌는 신호(주황·보라 다이아몬드)와 장대 캔들 종가가 같이 나올 때 추세 방향으로 진입합니다.",
    markerBull: "◆↑",
    markerBear: "◆↓",
    typicalDirection: "neutral",
  },
  failed_breakout_short: {
    label: "Failed breakout short",
    labelKo: "실패 돌파 숏",
    description:
      "고점을 못 넘기고 VWAP도 못 넘으며, 윗꼬리 매도세·하락형 캔들 뒤 직전 양봉 저점을 깨면 매도합니다.",
    markerBull: "FB↑",
    markerBear: "FB↓",
    typicalDirection: "bearish",
  },
  obv_divergence: {
    label: "OBV divergence",
    labelKo: "OBV 다이버전스",
    description:
      "주가는 더 높은 고점을 찍었는데 OBV 고점은 낮아지면 하락 전환을, 주가는 더 낮은 저점인데 OBV 저점은 높아지면 상승 전환을 노립니다.",
    markerBull: "OD↑",
    markerBear: "OD↓",
    typicalDirection: "neutral",
  },
  obv_keltner: {
    label: "OBV + Keltner",
    labelKo: "OBV+켈트너",
    description:
      "켈트너 위쪽을 넘고 OBV도 올라가면 매수, 아래쪽을 깨고 OBV도 내려가면 매도합니다. OBV로 돌파에 실린 매수·매도 힘을 확인합니다.",
    markerBull: "OK↑",
    markerBear: "OK↓",
    typicalDirection: "neutral",
  },
  obv_fast_thrust: {
    label: "Fast OBV thrust",
    labelKo: "패스트 OBV 추력",
    description:
      "OBV가 단기간에 크게 움직이고 최근 고점·저점을 넘을 때 빠르게 들어갑니다.",
    markerBull: "OF↑",
    markerBear: "OF↓",
    typicalDirection: "neutral",
  },
  ad_divergence: {
    label: "A/D divergence",
    labelKo: "A/D 다이버전스",
    description:
      "주가 고점은 올랐는데 A/D선 고점은 낮아지면 매도·익절, 주가 저점은 내렸는데 A/D선 저점은 높아지면 매수합니다. 종가 위치까지 반영해 OBV보다 세밀합니다.",
    markerBull: "AD↑",
    markerBear: "AD↓",
    typicalDirection: "neutral",
  },
  chaikin_zero: {
    label: "Chaikin zero cross",
    labelKo: "Chaikin 0선",
    description:
      "차이킨은 A/D(종가가 봉 어디에 붙었는지×거래량)의 단기 EMA − 장기 EMA입니다. 0선 위는 최근 매집이 평소보다 빨라진 것, 아래는 분산이 빨라진 것입니다. 위로 넘으면 매수 쪽 가속, 아래로 넘으면 매도 쪽 가속으로 봅니다.",
    markerBull: "CZ↑",
    markerBear: "CZ↓",
    typicalDirection: "neutral",
  },
  chaikin_divergence: {
    label: "Chaikin divergence",
    labelKo: "Chaikin 다이버전스",
    description:
      "주가와 차이킨이 어긋나면, 가격은 더 갔는데 매집/분산의 가속은 따라가지 못한 것입니다. 고점은 올랐는데 차이킨 고점은 낮아지면 하락 전환, 저점은 내렸는데 차이킨 저점은 높아지면 상승 전환을 봅니다.",
    markerBull: "CD↑",
    markerBear: "CD↓",
    typicalDirection: "neutral",
  },
  equivolume_oversquare: {
    label: "EquiVolume oversquare",
    labelKo: "EquiVolume 뚱보형",
    description:
      "스윙 고점에서 뚱뚱한 캔들이면 매물 과다·하락을 조심, 스윙 저점에서 뚱뚱한 캔들이면 매집·상승 후보로 봅니다. EquiVolume과 EOM을 함께 봅니다.",
    markerBull: "EQ↑",
    markerBear: "EQ↓",
    typicalDirection: "neutral",
  },
  eom_zero: {
    label: "EOM zero cross",
    labelKo: "EOM 0선",
    description:
      "EOM은 (중간가 이동) ÷ (거래량/봉폭)입니다. 같은 거래량으로 가격이 잘 움직이면 값이 큽니다. 스무스선이 0 위로 가면 오르기 쉬운 힘, 0 아래로 가면 내리기 쉬운 힘으로 봅니다.",
    markerBull: "EM↑",
    markerBear: "EM↓",
    typicalDirection: "neutral",
  },
};
