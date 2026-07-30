import type { HelpContent } from "./indicatorHelp";
import type { ClassicStrategyId } from "./classicStrategyMeta";
import { CLASSIC_STRATEGY_META } from "./classicStrategyMeta";

const BREAK = { higherLabel: "돌파 시", lowerLabel: "실패 시" } as const;

export const CLASSIC_STRATEGY_HELP: Record<ClassicStrategyId, HelpContent> = {
  ma_golden_dead: {
    title: "이평 골든·데드",
    summary: CLASSIC_STRATEGY_META.ma_golden_dead.description,
    howToFind:
      "SMA20(단기)이 SMA50(중기)을 아래에서 위로 뚫으면 골든(롱), 위에서 아래로 뚫으면 데드(숏). 사이드바에서 SMA 20·50 오버레이를 켜 두세요. 고전 25/75/150 감각의 축소판입니다.",
    ...BREAK,
    higher:
      "골든 → 롱 후보. 실전에서는 이미 상승 5~6부 능선인 경우가 많아, 추격보다 목표가·손절을 같이 잡으세요.",
    lower:
      "데드 → 숏/청산 후보. 하락 중반 확인인 경우가 많습니다. 1~2부 능선 매수 준비는 별도 규칙으로.",
    worksWith:
      "거래량(다우 확인), MACD 0선, 스윙 HH/HL. 세 이평이 얽힌 보합에서는 매수 보류가 낫습니다.",
    pros:
      "추세 전환을 객관적 교차로 확인합니다. 이평론·다우 추세 추종의 뼈대입니다.",
    cons:
      "후행성이 큽니다. 횡보 휩쏘·중반 진입이 흔하고, ‘얼마나 갈지’는 알려 주지 않습니다.",
    tip: "골든 직후 전량 추격보다, 정배열 유지·눌림을 보는 편이 안전합니다.",
  },
  fib_wave_pullback: {
    title: "피보 2·4파 눌림",
    summary: CLASSIC_STRATEGY_META.fib_wave_pullback.description,
    howToFind:
      "스윙 저→고(상승 추진) 후 가격이 38.2~61.8% 되돌림 구간에 들어오고 양봉·저점 방어가 나오면 롱. 고→저 추진 후 같은 구간에서 음봉·고점 저항이면 숏. 앵커는 자동 스윙이며, 수동 피보 도구와 별개입니다.",
    ...BREAK,
    higher:
      "상승 추진 후 38.2~61.8% 구간 반등 확인 → 롱(2·4파 감각). 손절은 추진 시작 저점(절대규칙: 2파가 1파 저 아래면 무효).",
    lower:
      "하락 추진 후 38.2~61.8% 반등 구간에서 저항 확인 → 숏.",
    worksWith:
      "스윙 구조, 지지·저항, 거래량, RSI 과매도 탈출. 갠 존과 겹치면 신뢰↑.",
    pros:
      "엘리어트 ‘어느 정도 되돌릴지’를 피보 구간으로 규칙화합니다. 목표가(추진 재개)와 손절이 선명합니다.",
    cons:
      "스윙·파동 번호가 주관적이고, 자동 앵커가 잘못된 추진을 집을 수 있습니다. 강한 추세에서는 되돌림이 얕아 신호가 없습니다.",
    tip: "한 숫자에 집착하지 말고 38.2~61.8을 영역으로 보세요. 1파 저점 이탈이면 카운트·롱을 폐기하세요.",
  },
  gann_zone: {
    title: "갠 되돌림 존",
    summary: CLASSIC_STRATEGY_META.gann_zone.description,
    howToFind:
      "최근 스윙 저(P1)·고(P2)로 1×1(45°)·1×2(≈63°) 각도를 만들고 RZH~RZL 구간을 잡습니다. 상승 조정 중 구간 내 반등 확인=롱, 하락 조정 중 구간 내 저항=숏. 차트에 각도선이 같이 그려집니다(전략 ON 시).",
    ...BREAK,
    higher:
      "RZH~RZL 구간에서 지지·양봉 확인 → 롱. 손절은 RZL 아래 또는 P1.",
    lower:
      "대칭 구간에서 저항·음봉 확인 → 숏.",
    worksWith:
      "피보 2·4파(구간 겹침), 지지·저항, 거래량. 앵커(고·저) 선택이 전부입니다.",
    pros:
      "갠·다우 1/3·1/2 되돌림을 각도 틀로 보여 줍니다. 피보와 다른 컨플루언스를 줍니다.",
    cons:
      "가격·시간 스케일(ATR 단위)에 따라 각도가 달라지고, 카디날 사각형 전체는 근사입니다. 해석·앵커가 주관적입니다.",
    tip: "RZH/RZL 한 숫자에 집착하지 말고 구간으로 보세요. 앱은 고정 인치 모눈지가 아니라 ATR 스케일 근사입니다.",
  },
};

export function classicStrategyHelp(id: ClassicStrategyId): HelpContent {
  return CLASSIC_STRATEGY_HELP[id];
}
