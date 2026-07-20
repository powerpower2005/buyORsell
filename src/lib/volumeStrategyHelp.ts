import type { HelpContent } from "./indicatorHelp";
import type { VolumeStrategyId } from "./volumeStrategyMeta";
import { VOLUME_STRATEGY_META } from "./volumeStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const VOLUME_STRATEGY_HELP: Record<VolumeStrategyId, HelpContent> = {
  heatmap_volume: {
    title: "히트맵 볼륨",
    summary: VOLUME_STRATEGY_META.heatmap_volume.description,
    howToFind:
      "거래량을 평균(20) 대비 배수로 나눕니다. Extra High≥3(빨강), High≥1.5(주황), Medium≥0.5(노랑). 파라볼릭 SAR이 매수/매도로 뒤집히고, 종가가 EMA60 위(롱)·아래(숏)이며, 히트맵이 노랑·주황·빨강(중간 이상)일 때 마커가 찍힙니다. 파란·하늘색(약한 거래량) 구간은 피합니다.",
    ...BREAK,
    higher:
      "EMA60 위 + SAR 바이 + 중간↑ 거래량 → 롱. 손절은 직전 저점, 익절은 손익비 2:1 이상.",
    lower:
      "EMA60 아래 + SAR 셀 + 중간↑ 거래량 → 숏. 손절은 직전 고점, 익절은 손익비 2:1 이상.",
    worksWith:
      "EMA(60)·파라볼릭 SAR, 추세선·지지저항. 히트맵은 시그널을 직접 주지 않으므로 추세·모멘텀과 겹칠 때만 씁니다.",
    tip: "가격만 움직이고 거래량이 미미하면 신뢰도가 낮습니다. 중간 이상 색(노랑↑)에서만 진입하세요.",
  },
  volume_fight: {
    title: "볼륨 파이트",
    summary: VOLUME_STRATEGY_META.volume_fight.description,
    howToFind:
      "양봉 거래량은 매수, 음봉 거래량은 매도로 보고 최근 구간 순매수 압력을 합산합니다. 영선 위·녹색이면 매수 우위, 영선 아래·빨강이면 매도 우위, 회색(중립)은 매매를 피합니다. SAR 플립 + EMA60 방향과 세력 우위가 같을 때 마커가 찍힙니다.",
    ...BREAK,
    higher: "EMA60 위 + SAR 바이 + 영선 위 녹색 → 롱만.",
    lower: "EMA60 아래 + SAR 셀 + 영선 아래 빨강 → 숏만.",
    worksWith:
      "히트맵 볼륨(참여 강도), VSA(세력 의도), EMA60·SAR. 회색 중립 구간 신호는 무시하세요.",
    tip: "잘못된 진입을 걸러내는 필터에 가깝습니다. 스캘핑·단타·스윙 모두에 같은 원칙을 씁니다.",
  },
  vsa: {
    title: "VSA (Volume Spread Analysis)",
    summary: VOLUME_STRATEGY_META.vsa.description,
    howToFind:
      "거래량이 이동평균 위에 있고 히트맵이 노랑·빨강(강한 개입)일 때, EMA60 방향과 파라볼릭 SAR 신호가 같으면 마커가 찍힙니다. 긴 아래꼬리+거래량 급증은 매집, 긴 윗꼬리+음봉+거래량 급증은 물량 던지기 후보로 봅니다.",
    ...BREAK,
    higher:
      "EMA60 위 + SAR 바이 + 평균↑·강한 거래량 → 롱. 손절 직전 저점, 익절 손익비 2:1↑.",
    lower:
      "EMA60 아래 + SAR 셀 + 평균↑·강한 거래량 → 숏. 손절 직전 고점, 익절 손익비 2:1↑.",
    worksWith:
      "히트맵·볼륨 파이트, 캔들 꼬리·몸통, 지지·저항. 가격↓+거래량↑만으로 매수하지 마세요(진짜 하락일 수 있음).",
    tip: "세력은 거래량을 숨기기 어렵다는 전제입니다. 거래량만 보지 말고 스프레드(캔들 폭)·마감 위치를 같이 보세요.",
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
    tip: "원래 5분봉 눌림목 아이디어를 일봉·보유 창 VWAP에 맞게 적용한 마커입니다. VWAP 초기 구간(데이터 앞부분)은 노이즈가 큽니다.",
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
  obv_divergence: {
    title: "OBV 다이버전스",
    summary: VOLUME_STRATEGY_META.obv_divergence.description,
    howToFind:
      "거래량만으로는 매수/매도 구분이 안 됩니다. OBV는 종가↑면 거래량 가산, 종가↓면 감산해 ‘힘의 방향’을 보여 줍니다. 하락 다이버전스: 가격 스윙 고점 HH인데 OBV 고점은 LH → 물량 정리·숏/익절 후보. 상승 다이버전스: 가격 LL + OBV HL → 매수세 유입·롱 후보. 종가 선으로 보면 더 잘 보입니다.",
    ...BREAK,
    higher: "가격 LL + OBV HL → 롱·눌림목 매수 후보(공포 매도 자리와 구분).",
    lower: "가격 HH + OBV LH → 숏·익절 후보(겉상승·속매도).",
    worksWith:
      "켈트너·볼린저(위치), OBV+켈트너 돌파 전략, RSI/MACD 다이버전스. OBV 수치 절대값보다 방향·다이버전스가 핵심입니다.",
    tip: "가격은 제자리인데 OBV만 우상향이면 강한 매수 유입·곧 분출 후보로 봅니다.",
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
};

export function volumeStrategyHelp(id: VolumeStrategyId): HelpContent {
  return VOLUME_STRATEGY_HELP[id];
}
