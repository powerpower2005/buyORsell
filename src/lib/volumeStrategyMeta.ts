import type { TrendLabel } from "./types";

/** Volume / VWAP / OBV playbooks — keep separate. */
export type VolumeStrategyId =
  | "heatmap_volume"
  | "volume_fight"
  | "vsa"
  | "vwap_pullback"
  | "vwap_band_reversal"
  | "vwap_switching"
  | "obv_divergence"
  | "obv_keltner"
  | "obv_fast_thrust";

export const VOLUME_STRATEGY_ORDER: VolumeStrategyId[] = [
  "heatmap_volume",
  "volume_fight",
  "vsa",
  "vwap_pullback",
  "vwap_band_reversal",
  "vwap_switching",
  "obv_divergence",
  "obv_keltner",
  "obv_fast_thrust",
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
};
