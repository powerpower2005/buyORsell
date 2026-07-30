import type { HelpContent } from "./indicatorHelp";
import type { RsiStrategyId } from "./rsiStrategyMeta";
import { RSI_STRATEGY_META } from "./rsiStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const RSI_STRATEGY_HELP: Record<RsiStrategyId, HelpContent> = {
  rsi_classic_obos: {
    title: "고전 RSI 과매수·과매도",
    summary: RSI_STRATEGY_META.rsi_classic_obos.description,
    howToFind:
      "RSI가 30 아래를 상향 돌파하면 롱, 70 위를 하향 돌파하면 숏 마커입니다. 다우·이평이 못 주는 ‘과열·과매도’를 보완하는 오실레이터이나, 강한 추세(3파)에서는 너무 이른 신호가 나기 쉽습니다.",
    ...BREAK,
    higher: "30 이탈 상향 → 과매도 탈출·반등 후보(롱).",
    lower: "70 이탈 하향 → 과매수 탈출·조정 후보(숏).",
    worksWith:
      "SMA/EMA·MACD 0선(추세 필터), 지지·저항, 볼린저. 추세와 반대 방향 OB/OS는 피하세요.",
    pros:
      "후행 이평·다우 추세 확인의 약점(과열 구간)을 숫자로 보완합니다. 규칙이 단순합니다.",
    cons:
      "고정 70/30은 추세장에서 실패가 잦고, 같은 RSI를 보고도 매수/매도 해석이 갈립니다(기술적 분석 주관성). 엘리어트 3파에서는 과매수가 오래갑니다.",
    tip: "박스권에선 참고 가능, 추세장에선 승률이 떨어지는 편입니다. 슈퍼 RSI 전략과 비교해 보세요.",
  },
  super_rsi_obos: {
    title: "슈퍼 RSI 유동 과매수·과매도",
    summary: RSI_STRATEGY_META.super_rsi_obos.description,
    howToFind:
      "패널의 분홍(상단)·녹색(하단) 유동 밴드와 검은 가중 RSI를 봅니다. 가중선이 상단을 뚫었다가 다시 하향 이탈하면 숏, 하단을 찍었다가 상향 이탈하면 롱입니다. 추세에 맞춰 기준이 움직여 고전 70/30보다 덜 이른 편입니다.",
    ...BREAK,
    higher: "유동 과매도선 상향 이탈 → 롱(매도세 약화 후 반등).",
    lower: "유동 과매수선 하향 이탈 → 숏(상승 끝·매도 전환).",
    worksWith:
      "볼린저(가격 밴드와 같이), MACD 시그널 크로스, 지지·저항. 유동 밴드라 추세장에서도 고전 70/30보다 덜 이른 편입니다.",
    pros:
      "국면(강·약세)에 맞춰 과열 기준이 움직여, 이평론이 말한 ‘국면별 신호가 다르다’는 문제를 완화합니다.",
    cons:
      "밴드·가중 해석이 더 주관적이고, 여전히 후행·횡보 노이즈가 있습니다. 만능이 아닙니다.",
    tip: "고정 70/30보다 추세에 맞춰 기준이 움직이므로 조기 익절을 줄이는 데 도움이 됩니다.",
  },
  super_rsi_squeeze_mid: {
    title: "슈퍼 RSI 수렴→중심선 돌파",
    summary: RSI_STRATEGY_META.super_rsi_squeeze_mid.description,
    howToFind:
      "유동 밴드 폭이 최근보다 크게 좁아진(수렴) 뒤 다시 넓어지기 시작할 때, 검은 가중 RSI가 노란 중심선을 상·하향 돌파하는 봉을 찾습니다. 이평 혼선(보합) 뒤 방향이 나는 국면과 닮았습니다.",
    ...BREAK,
    higher: "수렴 후 중심선 상향 돌파 → 롱. 손절은 최근 저점 참고.",
    lower: "수렴 후 중심선 하향 돌파 → 숏.",
    worksWith:
      "볼린저 스퀴즈, MACD Hist 확대, ATR(변동성 확대). 모멘텀 발산과 겹치면 힘이 큰 편입니다.",
    pros:
      "보합·혼선 뒤 새 추세(다우 전환·1파/3파 초입 감각)를 모멘텀으로 잡기 좋습니다.",
    cons:
      "신호가 드물고 후행이며, 가짜 돌파(헤드페이크)가 있습니다. 목표가·지속 기간은 안 줍니다.",
    tip: "신호는 드물지만 모멘텀 발산과 겹치면 힘이 큰 편입니다.",
  },
  rsi_divergence: {
    title: "RSI 다이버전스",
    summary: RSI_STRATEGY_META.rsi_divergence.description,
    howToFind:
      "상승: 가격 스윙 저점 LL인데 RSI 저점은 HL. 하락: 가격 스윙 고점 HH인데 RSI 고점은 LH. 두 번째 스윙 봉에 마커가 찍힙니다. 엘리어트 5파 말기·다우 전환 후보에서 자주 씁니다.",
    ...BREAK,
    higher: "상승 다이버전스 → 롱·반등 후보.",
    lower: "하락 다이버전스 → 숏·조정 후보. 스윙을 깨면 무효화될 수 있습니다.",
    worksWith:
      "스윙 구조, 지지·저항, MACD·스토캐 다이버전스, 거래량. 단독보다 위치·교차 확인과 같이 보세요.",
    pros:
      "추세 추종만으로 놓치는 모멘텀 약화를 스윙으로 보여 줍니다.",
    cons:
      "스윙 선택이 주관적이고 트랩이 많으며, ‘선행’처럼 보여도 확정은 후행입니다. 엘리어트처럼 해석이 갈립니다.",
    tip: "추세 끝에서 더 의미 있습니다. 단독보다 지지·저항·패턴과 함께 보세요.",
  },
  double_rsi_cross: {
    title: "이중 RSI 교차",
    summary: RSI_STRATEGY_META.double_rsi_cross.description,
    howToFind:
      "단기 RSI(7)가 장기 RSI(21)를 상향 돌파하면 롱, 하향 돌파하면 숏입니다. 이동평균 골든/데드와 같은 틀을 모멘텀에 적용한 것입니다. 실전 골든이 5~6부 능선인 문제와도 통합니다.",
    ...BREAK,
    higher: "단기>장기 상향 교차 → 롱 모멘텀.",
    lower: "단기<장기 하향 교차 → 숏 모멘텀.",
    worksWith:
      "이평·MACD(추세 방향), 거래량. 횡보에서는 교차가 잦아 이평 필터를 권합니다.",
    pros:
      "이평 교차보다 가격 모멘텀에 민감해 전환을 조금 일찍 볼 수 있습니다. 규칙화가 쉽습니다.",
    cons:
      "횡보 휩쏘·후행성(중반 확인)이 남고, 단기선처럼 민감합니다. 세 선이 얽힌 보합에서는 매수를 보류하는 이평론과 같이 관망이 낫습니다.",
    tip: "추세장에선 쓸 만하지만 횡보장에선 손절이 잦을 수 있습니다.",
  },
};

export function rsiStrategyHelp(id: RsiStrategyId): HelpContent {
  return RSI_STRATEGY_HELP[id];
}
