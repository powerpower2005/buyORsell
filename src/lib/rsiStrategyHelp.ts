import type { HelpContent } from "./indicatorHelp";
import type { RsiStrategyId } from "./rsiStrategyMeta";
import { RSI_STRATEGY_META } from "./rsiStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const RSI_STRATEGY_HELP: Record<RsiStrategyId, HelpContent> = {
  rsi_classic_obos: {
    title: "고전 RSI 과매수·과매도",
    summary: RSI_STRATEGY_META.rsi_classic_obos.description,
    howToFind:
      "RSI가 30 아래를 상향 돌파하면 롱, 70 위를 하향 돌파하면 숏. 엔트리는 그 돌파만 봅니다. 강한 추세에서는 RSI가 과열 구간에 오래 머물러 역방향 진입이 실패하기 쉽습니다.",
    ...BREAK,
    higher: "30 이탈 상향 → 과매도 탈출·반등 후보(롱).",
    lower: "70 이탈 하향 → 과매수 탈출·조정 후보(숏).",
    worksWith:
      "같이 켤 지표: SMA200·ADX(추세장 역행 주의), 지지·저항, 거래량. 추세와 반대 OB/OS는 companion으로 걸러 보세요.",
    pros: "규칙이 단순하고 과열·과매도 구간을 숫자로 보여 줍니다.",
    cons:
      "고정 70/30은 추세장에서 실패가 잦습니다. 교재도 이 단독 활용을 한계로 둡니다.",
    tip: "박스권 참고용. 추세장에선 슈퍼 RSI·다이버전스+S/R을 우선하세요.",
  },
  super_rsi_obos: {
    title: "슈퍼 RSI 유동 과매수·과매도",
    summary: RSI_STRATEGY_META.super_rsi_obos.description,
    howToFind:
      "분홍(상단)·녹색(하단) 유동 밴드와 검은 가중 RSI. 가중선이 상단 이탈 후 하향→숏, 하단 이탈 후 상향→롱. 엔트리는 유동선 이탈만.",
    ...BREAK,
    higher: "유동 과매도선 상향 이탈 → 롱.",
    lower: "유동 과매수선 하향 이탈 → 숏.",
    worksWith: "S/R·거래량·ADX. 고전 70/30보다 추세에 맞춰 기준이 움직입니다.",
    tip: "고정선보다 덜 이르지만, 횡보·가짜 이탈은 companion으로 확인하세요.",
  },
  super_rsi_squeeze_mid: {
    title: "슈퍼 RSI 수렴→중심선 돌파",
    summary: RSI_STRATEGY_META.super_rsi_squeeze_mid.description,
    howToFind:
      "유동 밴드가 좁아진 뒤 넓어질 때, 가중 RSI가 노란 중심선을 상·하향 돌파하는 봉을 찾습니다.",
    ...BREAK,
    higher: "수렴 후 중심선 상향 → 롱.",
    lower: "수렴 후 중심선 하향 → 숏.",
    worksWith: "거래량·ADX·볼린저 스퀴즈(가격 쪽 수렴과 교차 확인).",
    tip: "신호는 드물지만 발산과 겹치면 힘이 큰 편입니다.",
  },
  rsi_divergence: {
    title: "RSI 다이버전스",
    summary: RSI_STRATEGY_META.rsi_divergence.description,
    howToFind:
      "표준: 상승(불리시)=가격 LL + RSI HL → 롱 후보. 하락(베어리시)=가격 HH + RSI LH → 숏 후보. 두 번째 스윙에 마커. (일부 자료가 이름을 반대로 쓴 경우가 있음 — 앱은 표준.)",
    ...BREAK,
    higher: "상승 다이버전스 → 롱·반등 후보.",
    lower: "하락 다이버전스 → 숏·조정 후보.",
    worksWith:
      "핵심 지지·저항(유형1), 망치/유성(반응 캔들), ADX·거래량, SMA200. 다이버전스만으로 진입하지 말고 추세선 돌파·캔들 확인을 companion으로.",
    tip: "와이드(스윙 큼)=식별 쉬움, 타이트(스윙 좁음)=라인/피벗으로 확인 — 하드 필터 아님. 멀티 TF·상관관계는 수동 확인.",
  },
  double_rsi_cross: {
    title: "이중 RSI 교차",
    summary: RSI_STRATEGY_META.double_rsi_cross.description,
    howToFind:
      "단기 RSI(7)가 장기 RSI(21)를 상향→롱, 하향→숏. 엔트리는 교차만.",
    ...BREAK,
    higher: "단기>장기 상향 교차 → 롱.",
    lower: "단기<장기 하향 교차 → 숏.",
    worksWith: "SMA200·ADX(추세 필터)·거래량. 횡보 교차는 companion으로 걸러 보세요.",
    tip: "추세장에 유리, 횡보에선 손절이 잦을 수 있습니다.",
  },
};

export function rsiStrategyHelp(id: RsiStrategyId): HelpContent {
  return RSI_STRATEGY_HELP[id];
}
