/**
 * Companion layers shown under each strategy toggle.
 * Core deps (auto-enabled on strategy ON) + optional confirm layers share one list with why-text.
 */

import { AUX_INDICATOR_META, type AuxIndicatorId } from "./auxIndicatorStore";
import { CANDLE_PATTERN_META } from "./candlePatternMeta";
import type { CandlePatternId } from "./evaluation/candlePatterns";
import { SR_CHART_TOGGLE_META, type SrChartToggleId } from "./srZoneStore";
import {
  candle,
  layersForStrategy,
  type LayerKey,
  type StrategyFamily,
} from "./strategyIndicatorDeps";

export interface StrategyCompanion {
  key: LayerKey;
  label: string;
  why: string;
}

const VOL: LayerKey = "volume";
const RSI: LayerKey = "aux:rsi";
const MACD: LayerKey = "aux:macd";
const STOCH: LayerKey = "aux:stoch";
const ADX: LayerKey = "aux:adx";
const VWAP: LayerKey = "aux:vwap";
const SUP: LayerKey = "sr:support";
const RES: LayerKey = "sr:resistance";
const SMA20: LayerKey = "sma:20";
const SMA200: LayerKey = "sma:200";
const BB_WIDE: LayerKey = "aux:bbWide";
const DISPARITY: LayerKey = "aux:disparity";
const HAMMER = candle("hammer");
const SHOOTING = candle("shooting_star");
const HANGING = candle("hanging_man");
const BULL_MARU = candle("bullish_marubozu");
const BEAR_MARU = candle("bearish_marubozu");

const DEFAULT_WHY: Partial<Record<LayerKey, string>> = {
  volume: "평균(volMA) 대비 참여 — 위=추세·돌파 힘, 아래=약세·가짜 돌파 주의",
  bb: "밴드 위치·폭으로 과열·횡보·돌파 확인",
  ichimoku: "구름·전환/기준으로 추세 맥락 확인",
  [RSI]: "과매수·과매도·다이버전스 확인",
  [MACD]: "추세·모멘텀 방향 확인",
  [STOCH]: "단기 과열·크로스 확인",
  [ADX]: "추세 강도(횡보 필터)",
  [VWAP]: "평균단가·기관식 지지/저항",
  "aux:mfi": "거래량 반영 과열·자금 흐름",
  "aux:atr": "변동성·손절 폭 감각",
  "aux:obv": "누적 수급·다이버전스",
  "aux:ad": "매집/분산 흐름",
  "aux:chaikin": "단기 자금 흐름 오실레이터",
  "aux:eom": "이동 용이성(돌파 힘)",
  "aux:equivolume": "가격×거래량 박스 형태",
  "aux:keltner": "ATR 채널 돌파·회귀",
  "aux:forever_vwap": "장기 앵커 VWAP 위치",
  "aux:psar": "추세 플립·트레일 감각",
  "aux:cci": "과열·돌파 모멘텀",
  "aux:supertrend": "추세 전환 확인",
  "aux:bbPercentB": "밴드 내 상대 위치(%B)",
  [BB_WIDE]: "44기간(시가) 넓은 밴드 — 이중 터치·원비 확인",
  [DISPARITY]: "이평 대비 이격도(%) — 과열·다이버전스 확인",
  [SUP]: "반등·지지 위치 확인",
  [RES]: "저항·이탈 위치 확인",
  [SMA20]: "단기 추세·눌림 기준선",
  "sma:50": "중기 추세·골든/데드 상대선",
  [SMA200]: "장기 추세 필터 — 위=롱 우위·아래=숏 우위",
  "ema:12": "단기 반응 추세선",
  "ema:60": "중기 추세 필터",
  [HAMMER]: "하단 반전 후보(긴 아랫꼬리)",
  [SHOOTING]: "상단 반전 후보(긴 윗꼬리)",
  [HANGING]: "상승 후 피로·반전 경고",
  [BULL_MARU]: "강한 상승 돌파 봉",
  [BEAR_MARU]: "강한 하락 돌파 봉",
};

function layerLabel(key: LayerKey): string {
  if (key === "volume") return "거래량";
  if (key === "bb") return "볼린저";
  if (key === "ichimoku") return "일목균형표";
  if (key.startsWith("aux:")) {
    const id = key.slice(4) as AuxIndicatorId;
    return AUX_INDICATOR_META[id]?.labelKo ?? id.toUpperCase();
  }
  if (key.startsWith("sr:")) {
    const id = key.slice(3) as SrChartToggleId;
    return SR_CHART_TOGGLE_META[id]?.labelKo ?? id;
  }
  if (key.startsWith("sma:")) return `SMA${key.slice(4)}`;
  if (key.startsWith("ema:")) return `EMA${key.slice(4)}`;
  if (key.startsWith("candle:")) {
    const id = key.slice(7) as CandlePatternId;
    return CANDLE_PATTERN_META[id]?.labelKo ?? id;
  }
  return key;
}

function whyFor(key: LayerKey, override?: string): string {
  return override ?? DEFAULT_WHY[key] ?? "같이 보면 신호 맥락이 분명해집니다";
}

function companion(key: LayerKey, why?: string): StrategyCompanion {
  return { key, label: layerLabel(key), why: whyFor(key, why) };
}

/** Extra confirm layers beyond auto-enable deps (confidence, not hard gates). */
function extraConfirmLayers(
  family: StrategyFamily,
  id: string,
): StrategyCompanion[] {
  switch (family) {
    case "pattern":
      return [
        companion(VOL, "돌파·리테스트 봉의 참여 강도"),
        companion(SUP, "상승 돌파 후 지지로 바뀐 레벨"),
        companion(RES, "하락 돌파 후 저항으로 바뀐 레벨"),
      ];
    case "bb":
      if (id === "band_sr") {
        return [
          companion(
            HAMMER,
            "하단 터치 후 망치형이면 반전 신뢰↑ (진입 조건은 아님)",
          ),
          companion(
            SHOOTING,
            "상단 터치 후 유성형이면 반전 신뢰↑ (진입 조건은 아님)",
          ),
          companion(BB_WIDE, "22·44 이중 밴드 동시 터치인지 확인"),
          companion(SMA20, "추세 방향 필터(원비: 우상향 하단·우하향 상단)"),
          companion(RSI, "밴드 터치가 과매수·과매도인지 확인"),
          companion(SUP, "하단 터치가 지지선·매물대와 겹치는지"),
          companion(RES, "상단 터치가 저항선·매물대와 겹치는지"),
          companion(VOL, "터치·반등 봉 거래량"),
        ];
      }
      if (id === "band_breakout") {
        return [
          companion(VOL, "돌파 봉 거래량으로 가짜 돌파 걸러내기"),
          companion(BULL_MARU, "상단 돌파 시 강한 양봉인지"),
          companion(BEAR_MARU, "하단 돌파 시 강한 음봉인지"),
          companion(BB_WIDE, "넓은 밴드까지 밀어붙였는지(돌파 강도)"),
          companion(ADX, "추세 강도 — 약하면 돌파 신뢰↓"),
        ];
      }
      if (id === "squeeze") {
        return [
          companion(VOL, "돌파 봉 거래량으로 가짜 돌파 걸러내기"),
          companion(
            BULL_MARU,
            "해제 후 상단 돌파가 강한 양봉인지(헤드페이크 주의)",
          ),
          companion(BEAR_MARU, "해제 후 하단 이탈이 강한 음봉인지"),
          companion(BB_WIDE, "스퀴즈 해제 후 넓은 밴드 확장 여부"),
          companion(ADX, "돌파 후 추세가 붙는지"),
        ];
      }
      if (id === "divergence") {
        return [
          companion(
            DISPARITY,
            "이격도 다이버전스와 병행 확인(본 전략은 RSI 다이버전스)",
          ),
          companion(HAMMER, "강세 다이버전스 후 반전 봉 확인"),
          companion(SHOOTING, "약세 다이버전스 후 반전 봉 확인"),
          companion(SUP),
          companion(RES),
        ];
      }
      if (id === "trend_follow") {
        return [
          companion(VOL, "과열 구간 참여 강도"),
          companion(BB_WIDE, "넓은 밴드 밖이면 추세 가속 후보"),
          companion(SMA20, "추세 방향과 %B·MFI 과열이 같은지"),
        ];
      }
      return [companion(VOL)];
    case "rsi":
      if (id === "rsi_classic_obos") {
        return [
          companion(
            SMA200,
            "추세 필터 — 강한 상승에서 과매수 숏·강한 하락에서 과매도 롱 주의",
          ),
          companion(ADX, "추세 강하면 고전 70/30 신뢰↓ (횡보·박스에 더 맞음)"),
          companion(SUP, "과매도 탈출이 지지에서 나오는지"),
          companion(RES, "과매수 이탈이 저항에서 나오는지"),
          companion(VOL, "탈출·이탈 봉 참여 강도"),
        ];
      }
      if (id === "super_rsi_obos") {
        return [
          companion(SUP, "유동 과매도 이탈이 지지와 겹치는지"),
          companion(RES, "유동 과매수 이탈이 저항과 겹치는지"),
          companion(ADX, "추세 강도 — 유동 밴드도 횡보에선 휩쏘"),
          companion(VOL, "이탈 봉 거래량"),
        ];
      }
      if (id === "super_rsi_squeeze_mid") {
        return [
          companion(VOL, "중심선 돌파 봉 참여 강도"),
          companion(ADX, "발산 후 추세가 붙는지"),
          companion(BB_WIDE, "가격 스퀴즈·확장과 같이 보는지"),
        ];
      }
      if (id === "rsi_divergence") {
        return [
          companion(
            SUP,
            "상승 다이버전스가 핵심 지지·매물대에서인지 (유형1)",
          ),
          companion(
            RES,
            "하락 다이버전스가 핵심 저항·매물대에서인지",
          ),
          companion(
            HAMMER,
            "지지 다이버전스 후 반응 캔들(아랫꼬리)이면 확인↑",
          ),
          companion(
            SHOOTING,
            "저항 다이버전스 후 반응 캔들(윗꼬리)이면 확인↑",
          ),
          companion(
            ADX,
            "다이버전스 단독 금지 — 추세선 돌파·모멘텀 확인 감각",
          ),
          companion(VOL, "확인 봉 수급"),
          companion(SMA200, "대세와 어긋난 역추세 다이버전스는 보수적으로"),
        ];
      }
      if (id === "double_rsi_cross") {
        return [
          companion(
            SMA200,
            "추세 방향과 같은 쪽 교차만 (횡보 교차 걸러내기)",
          ),
          companion(ADX, "추세장에 유리 — 약하면 교차 신뢰↓"),
          companion(VOL, "교차 봉 참여 강도"),
        ];
      }
      return [
        companion(VOL, "반전·돌파 봉 수급 확인"),
        companion(SUP, "과매도 반등이 지지에서 나오는지"),
        companion(RES, "과매수 이탈이 저항에서 나오는지"),
      ];
    case "macd":
      if (id === "macd_signal_cross") {
        return [
          companion(
            SMA200,
            "추세 필터 — 위면 골든만·아래면 데드만 보는 편이 안전 (엔트리 조건 아님)",
          ),
          companion(SUP, "골든이 지지·매물대 근처인지"),
          companion(RES, "데드가 저항·매물대 근처인지"),
          companion(ADX, "횡보 휩쏘 걸러내기 — 약하면 교차 신뢰↓"),
          companion(VOL, "크로스 봉 참여 강도"),
        ];
      }
      if (id === "macd_zero_line") {
        return [
          companion(
            SMA200,
            "장기 추세 — 위에서의 0선 하향은 상승장 눌림 후보로만 참고(엔트리≠하향 매수)",
          ),
          companion(SUP, "0선 상향·눌림 재진입이 지지와 겹치는지"),
          companion(RES, "0선 하향·반등 재숏이 저항과 겹치는지"),
          companion(ADX, "추세장에서 0선 의미가 큼 · 횡보는 주의"),
          companion(VOL, "0선 돌파·재진입 봉 거래량"),
        ];
      }
      if (id === "macd_rsi_confirm") {
        return [
          companion(
            SMA200,
            "추세 방향과 RSI·MACD 확인이 같은지 (강한 추세에서 과매수 숏 주의)",
          ),
          companion(SUP, "과매도 탈출이 지지에서 나오는지"),
          companion(RES, "과매수 이탈이 저항에서 나오는지"),
          companion(VOL, "확인 봉 참여 강도"),
        ];
      }
      if (id === "macd_divergence") {
        return [
          companion(VOL, "다이버전스 후 크로스 봉 수급"),
          companion(SUP, "상승 다이버전스 지지 위치"),
          companion(RES, "하락 다이버전스 저항 위치"),
          companion(RSI, "RSI 다이버전스와 이중 확인"),
          companion(SMA200, "대세 추세와 어긋난 다이버전스는 보수적으로"),
        ];
      }
      if (id === "macd_trend_break") {
        return [
          companion(VOL, "가격·MACD 동시 돌파 봉 참여 강도"),
          companion(SUP, "돌파 전 지지·구조와 겹침"),
          companion(RES, "돌파 전 저항·구조와 겹침"),
          companion(ADX, "돌파 후 추세가 붙는지"),
          companion(
            SMA200,
            "대세 방향과 같은 돌파인지 (역방향은 가짜 돌파 주의)",
          ),
        ];
      }
      return [companion(VOL, "크로스·돌파 봉 참여 강도")];
    case "stoch":
      if (id === "stoch_sr_bounce" || id === "stoch_triple_bottom") {
        return [companion(SUP), companion(RES), companion(VOL)];
      }
      if (id === "stoch_ma20_cross") return [companion(VOL)];
      return [companion(VOL), companion(SUP), companion(RES)];
    case "ichimoku":
      if (id === "ichi_tk_cross") {
        return [
          companion(VOL, "교차 봉 참여 강도"),
          companion(
            ADX,
            "추세 강도 — 기준선 하락·횡보 중 호전은 보류 감각",
          ),
          companion(MACD, "모멘텀이 교차 방향과 같은지"),
          companion(SUP, "호전 후 지지가 잡히는지"),
          companion(RES, "역전 후 저항이 잡히는지"),
        ];
      }
      if (id === "ichi_chikou_cross") {
        return [
          companion(VOL, "후행 돌파·이탈 봉 참여 강도"),
          companion(ADX, "추세 지속 여부(이격 과다시 되돌림 주의)"),
          companion(MACD, "후행 신호와 모멘텀 방향이 같은지"),
        ];
      }
      if (id === "ichi_kumo_twist") {
        return [
          companion(VOL, "구름 색 전환 구간의 참여"),
          companion(ADX, "전환 후 추세가 붙는지"),
          companion(MACD, "양운/음운 전환과 모멘텀 일치"),
        ];
      }
      if (id === "ichi_price_kumo_break") {
        return [
          companion(VOL, "구름 돌파·이탈 봉 거래량으로 가짜 돌파 걸러내기"),
          companion(BULL_MARU, "상단 돌파가 강한 양봉인지"),
          companion(BEAR_MARU, "하단 이탈이 강한 음봉인지"),
          companion(ADX, "돌파 후 추세 강도"),
        ];
      }
      if (id === "ichi_trend_turn") {
        return [
          companion(VOL, "4신호 합류 구간의 거래량"),
          companion(ADX, "합류 후 추세가 실제로 붙는지"),
        ];
      }
      if (id === "ichi_breakout") {
        return [
          companion(VOL, "장대봉 구름 돌파의 참여 강도"),
          companion(ADX, "즉시 돌파 후 추세 지속"),
          companion(SUP, "돌파 전 박스·지지와 겹침"),
          companion(RES, "돌파 전 박스·저항과 겹침"),
        ];
      }
      if (id === "ichi_kumo_retest") {
        return [
          companion(
            HAMMER,
            "상향 돌파 후 되돌림에서 아랫꼬리(거부)면 신뢰↑",
          ),
          companion(
            SHOOTING,
            "하향 돌파 후 되돌림에서 윗꼬리(거부)면 신뢰↑",
          ),
          companion(VOL, "리테스트·재탈환 봉 거래량"),
          companion(ADX, "새 추세가 유지되는지"),
          companion(SUP, "구름 가장자리와 지지 겹침"),
          companion(RES, "구름 가장자리와 저항 겹침"),
        ];
      }
      if (id === "ichi_kumo_sr") {
        return [
          companion(
            HAMMER,
            "양운 지지 터치 후 망치형이면 반전 신뢰↑ (엔트리 조건 아님)",
          ),
          companion(
            SHOOTING,
            "음운 저항 터치 후 유성형이면 반전 신뢰↑",
          ),
          companion(VOL, "터치·전환선 돌파 봉 거래량"),
          companion(SUP, "구름 하단이 지지선·매물대와 겹치는지"),
          companion(RES, "구름 상단이 저항선·매물대와 겹치는지"),
          companion(ADX, "SpanB 수평·두꺼운 구름일수록 지지/저항 신뢰↑"),
        ];
      }
      return [companion(VOL)];
    case "classic":
      if (id === "ma_golden_dead") {
        return [companion(VOL, "교차 전후 추세 지속 여부")];
      }
      return [
        companion(SUP, "되돌림 구간의 지지"),
        companion(RES, "되돌림 구간의 저항"),
        companion(VOL),
      ];
    case "volume":
      if (id === "heatmap_volume" || id === "vsa") {
        return [
          companion(
            SUP,
            "롱이 지지·돌파 레벨과 겹치는지 (거래량↑ 확인은 엔트리에 이미 포함)",
          ),
          companion(RES, "숏이 저항·이탈 레벨과 겹치는지"),
          companion(ADX, "추세 강도 — 횡보+거래량 스파이크는 휩쏘"),
          companion(SMA20, "단기 가격 방향과 수급이 같은지"),
        ];
      }
      if (id === "volume_fight") {
        return [
          companion(
            ADX,
            "세력 우위+추세 — 가격↑인데 fight 약하면 상승 약화 후보",
          ),
          companion(SUP),
          companion(RES),
          companion(SMA20, "EMA60과 함께 단기 방향 확인"),
        ];
      }
      if (id === "failed_breakout_short") {
        return [
          companion(RES, "실패 돌파가 저항 재시험인지"),
          companion(SUP, "숏 목표가·지지까지 여유"),
          companion(
            VOL,
            "저거래량 돌파 후 실패와 잘 맞음 — 평균 아래 돌파는 가짜 후보",
          ),
          companion(SHOOTING, "윗꼬리 매도 캔들 확인"),
        ];
      }
      if (id.startsWith("vwap") || id === "forever_vwap_flip") {
        return [
          companion(SUP, "VWAP·밴드와 겹치는 지지"),
          companion(RES, "VWAP·밴드와 겹치는 저항"),
          companion(
            VOL,
            "돌파·반등 봉이 평균 거래량 위인지 (저거래=신뢰↓)",
          ),
          companion(ADX, "추세·횡보 구분"),
        ];
      }
      if (id.includes("divergence") || id === "obv_fast_thrust") {
        return [
          companion(SUP, "상승 다이버전스·추력이 지지에서인지"),
          companion(RES, "하락 다이버전스·추력이 저항에서인지"),
          companion(
            VOL,
            "가격↑+거래량↓ 약화와 같은 계열 — 원시 거래량도 같이 보세요",
          ),
          companion(ADX, "반전 vs 추세 지속 구분"),
        ];
      }
      if (id === "obv_keltner" || id === "eom_zero" || id === "equivolume_oversquare") {
        return [
          companion(VOL, "돌파·형태 확인 봉의 평균 대비 거래량"),
          companion(SUP),
          companion(RES),
          companion(ADX),
        ];
      }
      if (id === "chaikin_zero") {
        return [
          companion(VOL, "0선 돌파 봉 참여"),
          companion(SUP),
          companion(RES),
        ];
      }
      return [
        companion(SMA20, "단기 추세와 수급 방향이 같은지"),
        companion(VOL, "평균 대비 거래량으로 힘 확인"),
      ];
    case "combo":
      return [companion(VOL, "복합 신호 봉의 참여 강도")];
    default:
      return [];
  }
}

export function companionsForStrategy(
  family: StrategyFamily,
  id: string,
): StrategyCompanion[] {
  const seen = new Set<LayerKey>();
  const out: StrategyCompanion[] = [];

  for (const key of layersForStrategy(family, id)) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(companion(key));
  }

  for (const extra of extraConfirmLayers(family, id)) {
    if (seen.has(extra.key)) continue;
    seen.add(extra.key);
    out.push(extra);
  }

  return out;
}
