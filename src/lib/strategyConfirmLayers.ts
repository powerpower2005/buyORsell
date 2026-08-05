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
const BB_WIDE: LayerKey = "aux:bbWide";
const DISPARITY: LayerKey = "aux:disparity";
const HAMMER = candle("hammer");
const SHOOTING = candle("shooting_star");
const HANGING = candle("hanging_man");
const BULL_MARU = candle("bullish_marubozu");
const BEAR_MARU = candle("bearish_marubozu");

const DEFAULT_WHY: Partial<Record<LayerKey, string>> = {
  volume: "신호 봉 참여 강도·허위 돌파 필터",
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
      return [
        companion(VOL, "반전·돌파 봉 수급 확인"),
        companion(SUP, "과매도 반등이 지지에서 나오는지"),
        companion(RES, "과매수 이탈이 저항에서 나오는지"),
      ];
    case "macd":
      if (id === "macd_rsi_confirm") return [companion(VOL)];
      if (id === "macd_divergence") {
        return [companion(VOL), companion(SUP), companion(RES)];
      }
      return [companion(VOL, "크로스·돌파 봉 참여 강도")];
    case "stoch":
      if (id === "stoch_sr_bounce" || id === "stoch_triple_bottom") {
        return [companion(SUP), companion(RES), companion(VOL)];
      }
      if (id === "stoch_ma20_cross") return [companion(VOL)];
      return [companion(VOL), companion(SUP), companion(RES)];
    case "ichimoku":
      if (
        id === "ichi_price_kumo_break" ||
        id === "ichi_breakout" ||
        id === "ichi_trend_turn"
      ) {
        return [companion(VOL, "구름 돌파·전환 구간의 거래량")];
      }
      if (id === "ichi_kumo_sr") return [companion(VOL)];
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
      if (id.startsWith("vwap") || id === "failed_breakout_short") {
        return [
          companion(SUP, "VWAP·밴드와 겹치는 지지"),
          companion(RES, "VWAP·밴드와 겹치는 저항"),
        ];
      }
      if (id.includes("divergence") || id === "obv_fast_thrust") {
        return [companion(SUP), companion(RES)];
      }
      return [companion(SMA20, "단기 추세와 수급 방향이 같은지")];
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
