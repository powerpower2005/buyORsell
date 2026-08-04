/**
 * Generate local docs/ (gitignored):
 * - docs/indicators/INDEX.md  — labeled indicator catalog
 * - docs/strategies/INDEX.md  — strategy index + indicator labels
 * - docs/strategies/{family}/{id}.md — detailed per-strategy docs
 *
 * Run: node scripts/gen-strategy-docs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(root, "docs");
const indRoot = path.join(docsRoot, "indicators");
const stratRoot = path.join(docsRoot, "strategies");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function badge(ids) {
  return ids.map((id) => `\`${id}\``).join(" · ");
}

function indTable(ids) {
  return ids
    .map((id) => {
      const ind = INDICATORS[id];
      if (!ind) return `| \`${id}\` | — | — |`;
      return `| \`${id}\` | ${ind.nameKo} | ${ind.nameEn} |`;
    })
    .join("\n");
}

/** @type {Record<string, {
 *   id: string,
 *   nameKo: string,
 *   nameEn: string,
 *   category: string,
 *   what: string,
 *   params: string,
 *   series: string,
 *   file: string,
 *   kind: "plugin" | "structure" | "helper",
 * }>} */
const INDICATORS = {
  sma: {
    id: "sma",
    nameKo: "SMA (단순이동평균)",
    nameEn: "Simple Moving Average",
    category: "trend",
    what: "최근 종가의 단순 평균. 추세·위치 필터.",
    params: "periods: 20, 50, 200 (기본)",
    series: "sma:{period}",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  ema: {
    id: "ema",
    nameKo: "EMA (지수이동평균)",
    nameEn: "Exponential Moving Average",
    category: "trend",
    what: "최근 값에 더 큰 가중치를 둔 이동평균. SMA보다 빠름.",
    params: "periods: 12, 26, 60 (기본)",
    series: "ema:{period}",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  macd: {
    id: "macd",
    nameKo: "MACD",
    nameEn: "MACD",
    category: "trend",
    what: "빠른 EMA − 느린 EMA, 시그널선·히스토그램.",
    params: "fast 12 · slow 26 · signal 9",
    series: "macd, macdSignal, macdHist",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  adx: {
    id: "adx",
    nameKo: "ADX (평균방향성지수)",
    nameEn: "Average Directional Index",
    category: "trend",
    what: "추세 강도 0–100. +DI/−DI로 방향.",
    params: "period 14",
    series: "adx, plusDI, minusDI",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  psar: {
    id: "psar",
    nameKo: "Parabolic SAR",
    nameEn: "Parabolic SAR",
    category: "trend",
    what: "추세 추적 점. 가격이 SAR을 넘으면 방향 전환.",
    params: "step 0.02 · max 0.2",
    series: "psar (+ direction)",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  supertrend: {
    id: "supertrend",
    nameKo: "슈퍼트렌드",
    nameEn: "Supertrend",
    category: "trend",
    what: "ATR 기반 트레일링 스탑 + 방향 (±1).",
    params: "atrPeriod 10 · multiplier 3",
    series: "supertrend, direction",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  ichimoku: {
    id: "ichimoku",
    nameKo: "일목균형표",
    nameEn: "Ichimoku Cloud",
    category: "trend",
    what: "전환·기준·선행1/2·후행스팬 + 구름.",
    params: "9 / 26 / 52 · displacement 26",
    series: "tenkan, kijun, spanA, spanB, chikou",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  rsi: {
    id: "rsi",
    nameKo: "RSI · 슈퍼 RSI",
    nameEn: "RSI (+ Super RSI bands)",
    category: "momentum",
    what: "Wilder RSI 0–100. 가중 RSI + RSI 밴드(슈퍼 RSI) 포함.",
    params: "period 14 · OB 70 · OS 30 · Super: SMA4 + BB(20,1.5)",
    series: "rsi, rsiWeighted, rsiMid, rsiUpper, rsiLower",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  stoch: {
    id: "stoch",
    nameKo: "스토캐스틱",
    nameEn: "Stochastic Oscillator",
    category: "momentum",
    what: "느린 %K(스무딩)와 %D=SMA(%K).",
    params: "period 14 · slowing 1 · signal 3 · OB 80 · OS 20",
    series: "stochK, stochD",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  cci: {
    id: "cci",
    nameKo: "CCI",
    nameEn: "Commodity Channel Index",
    category: "momentum",
    what: "전형가격이 평균에서 얼마나 벗어났는지. ±100 참고.",
    params: "period 20",
    series: "cci",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  mfi: {
    id: "mfi",
    nameKo: "MFI (자금흐름지수)",
    nameEn: "Money Flow Index",
    category: "momentum",
    what: "거래량 가중 RSI류 오실레이터 0–100.",
    params: "period 14",
    series: "mfi",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  bb: {
    id: "bb",
    nameKo: "볼린저 밴드",
    nameEn: "Bollinger Bands",
    category: "volatility",
    what: "SMA ± 표준편차 밴드. %B·밴드폭 포함.",
    params: "period 20 · stdDev 2",
    series: "bbUpper, bbMiddle, bbLower, bbPercentB, bbBandwidth",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  atr: {
    id: "atr",
    nameKo: "ATR",
    nameEn: "Average True Range",
    category: "volatility",
    what: "변동성(진폭). 손절·필터·RR에 사용.",
    params: "period 14",
    series: "atr",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  keltner: {
    id: "keltner",
    nameKo: "켈트너 채널",
    nameEn: "Keltner Channel",
    category: "volatility",
    what: "EMA 중심 ± multiplier × ATR.",
    params: "ema 20 · atr 10 · mult 2",
    series: "mid, upper, lower",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  obv: {
    id: "obv",
    nameKo: "OBV",
    nameEn: "On-Balance Volume",
    category: "volume",
    what: "종가 방향에 따른 누적 거래량. 시그널 EMA·에너지 포함.",
    params: "signalPeriod 10 · energyLookback 8",
    series: "obv, obvSignal, energy, slope",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  ad: {
    id: "ad",
    nameKo: "A/D (매집/분산)",
    nameEn: "Accumulation/Distribution",
    category: "volume",
    what: "봉 내 종가 위치 × 거래량 누적.",
    params: "—",
    series: "ad",
    file: "src/lib/evaluation/indicators/volumeFlow.ts",
    kind: "plugin",
  },
  chaikin: {
    id: "chaikin",
    nameKo: "Chaikin Oscillator",
    nameEn: "Chaikin Oscillator",
    category: "volume",
    what: "A/D의 단기 EMA − 장기 EMA.",
    params: "fast 3 · slow 10",
    series: "chaikin, ad",
    file: "src/lib/evaluation/indicators/volumeFlow.ts",
    kind: "plugin",
  },
  eom: {
    id: "eom",
    nameKo: "EOM",
    nameEn: "Ease of Movement",
    category: "volume",
    what: "중간가 이동 ÷ 박스비율. SMA 스무딩.",
    params: "period 14 · scale 10000",
    series: "eom, eomSmooth",
    file: "src/lib/evaluation/indicators/volumeFlow.ts",
    kind: "plugin",
  },
  obvMid: {
    id: "obvMid",
    nameKo: "OBV Mid",
    nameEn: "OBV Midpoint",
    category: "volume",
    what: "(H+L)/2 기준 OBV. 플러그인만 등록, 전략 미사용.",
    params: "—",
    series: "obvMid",
    file: "src/lib/evaluation/indicators/volumeFlow.ts",
    kind: "plugin",
  },
  equivolume: {
    id: "equivolume",
    nameKo: "EquiVolume",
    nameEn: "EquiVolume",
    category: "volume",
    what: "거래량/레인지 비율로 narrow/square/oversquare 분류.",
    params: "lookback 20 · narrowMax 0.7 · oversquareMin 1.4",
    series: "boxRatio, shape, widthNorm (1/2/3)",
    file: "src/lib/evaluation/indicators/volumeFlow.ts",
    kind: "plugin",
  },
  vwap: {
    id: "vwap",
    nameKo: "VWAP",
    nameEn: "VWAP (+ σ bands)",
    category: "volume",
    what: "누적 윈도우 전형가격 VWAP + ±σ 밴드.",
    params: "stdDev1 2 · stdDev2 3",
    series: "vwap, upper1/2, lower1/2, slope",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  forever_vwap: {
    id: "forever_vwap",
    nameKo: "포에버 VWAP",
    nameEn: "Forever VWAP",
    category: "volume",
    what: "세션 리셋 없는 VWAP. 기울기 전환(flip) 표시.",
    params: "slopeLookback 3",
    series: "vwap, anchored, trend, flip, slope",
    file: "src/lib/evaluation/indicators/index.ts",
    kind: "plugin",
  },
  volume: {
    id: "volume",
    nameKo: "거래량",
    nameEn: "Raw Volume",
    category: "structure",
    what: "봉 거래량. 평균 대비 히트/VSA 필터.",
    params: "—",
    series: "bars[].volume",
    file: "OHLCV bars",
    kind: "structure",
  },
  volume_ma: {
    id: "volume_ma",
    nameKo: "거래량 이동평균",
    nameEn: "Volume MA",
    category: "structure",
    what: "거래량 SMA. 전략에선 주로 period 20.",
    params: "strategy inline: 20",
    series: "volMA",
    file: "src/lib/evaluation/volumeMa.ts (+ inline in volumeStrategies)",
    kind: "structure",
  },
  pivots: {
    id: "pivots",
    nameKo: "스윙 피벗",
    nameEn: "Swing Pivots",
    category: "structure",
    what: "로컬 고·저 피벗 (L/R=2 또는 N=3).",
    params: "left/right 2|3",
    series: "pivot highs/lows",
    file: "src/lib/evaluation/pivots.ts (+ inline in detectors)",
    kind: "structure",
  },
  support_resistance: {
    id: "support_resistance",
    nameKo: "지지·저항",
    nameEn: "Support/Resistance Zones",
    category: "structure",
    what: "스윙 클러스터 존 + 터치 품질.",
    params: "—",
    series: "zones",
    file: "src/lib/evaluation/supportResistance.ts",
    kind: "structure",
  },
  trendlines: {
    id: "trendlines",
    nameKo: "동적 추세선",
    nameEn: "Dynamic Trendlines",
    category: "structure",
    what: "상승/하락 스윙 연결 추세선.",
    params: "—",
    series: "ascending/descending lines",
    file: "src/lib/evaluation/trendlines.ts",
    kind: "structure",
  },
  fibonacci: {
    id: "fibonacci",
    nameKo: "피보나치 되돌림",
    nameEn: "Fibonacci Retracement",
    category: "structure",
    what: "스윙 추진 대비 되돌림 비율 (38.2–61.8 등).",
    params: "ratios 0.382–0.618 (전략)",
    series: "retrace levels",
    file: "classicStrategies.ts (+ fibonacciStore chart)",
    kind: "structure",
  },
  gann: {
    id: "gann",
    nameKo: "갠 각도·되돌림 존",
    nameEn: "Gann Fan / Zone",
    category: "structure",
    what: "ATR 단위 1×1/1×2/2×1 각도 + RZH~RZL 존.",
    params: "ATR unit · zone ≈33–50%",
    series: "fans, zones",
    file: "src/lib/evaluation/classicStrategies.ts",
    kind: "structure",
  },
  chart_patterns: {
    id: "chart_patterns",
    nameKo: "차트 패턴",
    nameEn: "Classical Chart Patterns",
    category: "structure",
    what: "H&S, 삼각형, 쌍바닥 등 + 목선·손절·목표가.",
    params: "—",
    series: "pattern instances",
    file: "src/lib/evaluation/chartPatterns.ts",
    kind: "structure",
  },
  candle_patterns: {
    id: "candle_patterns",
    nameKo: "캔들 패턴",
    nameEn: "Candlestick Patterns",
    category: "structure",
    what: "장악형 등 캔들 패턴.",
    params: "—",
    series: "candle hits",
    file: "src/lib/evaluation/candlePatterns.ts",
    kind: "structure",
  },
  atr_helper: {
    id: "atr_helper",
    nameKo: "ATR 헬퍼",
    nameEn: "ATR helper (Wilder)",
    category: "helper",
    what: "공유 ATR 시리즈 (피벗/갠/RR).",
    params: "period 14",
    series: "atr series",
    file: "src/lib/evaluation/pivots.ts (computeAtrSeries)",
    kind: "helper",
  },
};

const CATEGORY_ORDER = [
  ["trend", "추세 (Trend)"],
  ["momentum", "모멘텀 (Momentum)"],
  ["volatility", "변동성 (Volatility)"],
  ["volume", "거래량·자금흐름 (Volume)"],
  ["structure", "구조·오버레이 (Structure)"],
  ["helper", "헬퍼 (Helper)"],
];

/** @typedef {{
 *   id: string,
 *   label: string,
 *   summary: string,
 *   indicators: string[],
 *   bullish: string,
 *   bearish: string | null,
 *   stopTarget: string,
 *   notes: string,
 *   params: string,
 * }} Strat */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   meta: string,
 *   detector: string,
 *   detectFn: string,
 *   store: string,
 *   help: string,
 *   hasStopTarget: boolean,
 *   overview: string,
 *   strategies: Strat[],
 * }} Family */

/** @type {Family[]} */
const families = [
  {
    id: "bb",
    label: "볼린저",
    meta: "src/lib/bbStrategyMeta.ts",
    detector: "src/lib/evaluation/bbStrategies.ts",
    detectFn: "detectBbStrategies",
    store: "src/lib/bbStrategyStore.ts",
    help: "src/lib/chartLayerHelp.ts (bbStrategyHelp)",
    hasStopTarget: false,
    overview:
      "볼린저 밴드(및 %B·MFI·RSI)로 지지/돌파/스퀴즈/추세/다이버전스 히트를 낸다. 히트에 stop/target 없음.",
    strategies: [
      {
        id: "band_sr",
        label: "밴드 지지·저항",
        summary: "횡보에서 하단 터치 롱 / 상단 터치 숏.",
        indicators: ["bb"],
        bullish:
          "횡보 조건: |bbMiddle[i]−bbMiddle[i−5]| / mid ≤ 2%. 하단 터치(low ≤ lower + 밴드폭×3%) + close ≥ lower + 양봉(close > open).",
        bearish:
          "동일 횡보. 상단 터치(high ≥ upper − 밴드폭×3%) + close ≤ upper + 음봉.",
        stopTarget:
          "히트에 없음. 메타는 반대 밴드 익절·진입가 밖 손절을 말하지만 코드 미연결. 차트 RR = ATR×1.5 + 2R.",
        notes: "레인지 레짐에서만 동작.",
        params: "횡보 5봉 mid 변화 ≤2% · 터치 허용 밴드폭 3%",
      },
      {
        id: "band_breakout",
        label: "밴드 돌파",
        summary: "추세 중 **두 번째** 밴드 돌파에서 진입.",
        indicators: ["bb"],
        bullish:
          "상승( mid 5봉 상승). close가 upper 상향 돌파. 첫 돌파는 arm만, **2~20봉 안 두 번째** 돌파에서 히트. close < middle면 arm 리셋.",
        bearish:
          "하락( mid 하락). lower 하향 돌파 두 번째(2~20봉). close > middle면 리셋.",
        stopTarget: "히트에 없음. 차트 RR = ATR×1.5 + 2R.",
        notes: "첫 돌파가 아니라 두 번째 돌파가 신호.",
        params: "재돌파 창 2–20봉",
      },
      {
        id: "squeeze",
        label: "스퀴즈",
        summary: "밴드폭 축소 후 돌파 방향 진입.",
        indicators: ["bb"],
        bullish:
          "40봉 창에서 bandwidth percentile ≤ 0.2가 **≥3봉** (스퀴즈). 스퀴즈 종료 후 **5봉** 릴리즈 창에서 close가 upper 상향 돌파.",
        bearish: "동일 스퀴즈 후 close가 lower 하향 돌파.",
        stopTarget: "히트에 없음. 헤드페이크 위험 — 손절은 전략별 미구현.",
        notes: "percentile 샘플 ≥10 필요.",
        params: "percentile 창 40 · 스퀴즈 ≤20% · 유지 ≥3 · 릴리즈 5봉",
      },
      {
        id: "trend_follow",
        label: "추세 추종",
        summary: "%B + MFI 과열 동시 진입.",
        indicators: ["bb", "mfi"],
        bullish: "직전 봉은 미충족 → 현재 %B ≥ 0.8 **그리고** MFI ≥ 80 (엣지 진입).",
        bearish: "엣지로 %B < 0.2 **그리고** MFI < 20.",
        stopTarget: "히트에 없음.",
        notes: "MFI 시리즈 필수. 차트 레이어: bbPercentB + mfi.",
        params: "%B 0.8/0.2 · MFI 80/20",
      },
      {
        id: "divergence",
        label: "다이버전스",
        summary: "밴드 터치 피벗 다이버전스 후 중심선 돌파.",
        indicators: ["bb", "rsi"],
        bullish:
          "로컬 저점 L/R=2, 간격 3–40. 둘 다 하단 밴드 근처(밴드폭 8% 이내). 가격 LL + RSI HL. 2번째 피벗 후 **12봉** 내 close가 bbMiddle 상향 돌파.",
        bearish:
          "로컬 고점 상단 근처. 가격 HH + RSI LH. 12봉 내 close가 middle 하향 돌파.",
        stopTarget: "히트에 없음. 메타 R:R 2:1·재돌파 손절은 미연결.",
        notes: "확인은 중심선 크로스.",
        params: "피벗 L/R=2 · 간격 3–40 · 확인 창 12",
      },
    ],
  },
  {
    id: "classic",
    label: "고전 이론",
    meta: "src/lib/classicStrategyMeta.ts",
    detector: "src/lib/evaluation/classicStrategies.ts",
    detectFn: "detectClassicStrategies",
    store: "src/lib/classicStrategyStore.ts",
    help: "src/lib/classicStrategyHelp.ts",
    hasStopTarget: false,
    overview: "이평 교차, 피보 되돌림, 갠 존. stop/target 없음.",
    strategies: [
      {
        id: "ma_golden_dead",
        label: "이평 골든·데드",
        summary: "SMA20 × SMA50 교차.",
        indicators: ["sma"],
        bullish: "SMA20이 SMA50을 상향 돌파 (prev ≤ → cur >).",
        bearish: "SMA20이 SMA50을 하향 돌파.",
        stopTarget: "히트에 없음.",
        notes: "sma:20, sma:50 시리즈 필요. 추세 중반 신호일 수 있음.",
        params: "SMA 20 / 50",
      },
      {
        id: "fib_wave_pullback",
        label: "피보 2·4파 눌림",
        summary: "추진 후 38.2–61.8% 되돌림 반등/저항.",
        indicators: ["fibonacci", "pivots"],
        bullish:
          "피벗 N=3, 스팬 3–60 저→고 추진. 고점 후 40봉 내 low/mid가 38.2–61.8% 되돌림 + 양봉(close>open & close>prevClose). 저점 이탈 또는 고점*1.002 돌파 시 무효.",
        bearish:
          "고→저 추진. 38.2–61.8% 반등 구간 + 음봉. 고점 돌파/저점*0.998 이탈 시 무효.",
        stopTarget: "히트에 없음. (무효화는 신호 생성용, 포지션 손절 아님)",
        notes: "impulse key당 1히트.",
        params: "피벗 3 · 되돌림 38.2–61.8% · 창 40",
      },
      {
        id: "gann_zone",
        label: "갠 되돌림 존",
        summary: "RZL~RZH 존 또는 1×1 각도 터치.",
        indicators: ["gann", "pivots", "atr_helper"],
        bullish:
          "상승 존(≈저점 대비 33–50%) 터치 후 close>open & close≥존 중위 **또는** 1×1 지지 터치(허용=0.8%*|p|+0.15×ATR) + 양봉 + close>fan.",
        bearish: "하락 존 터치 + 음봉 + close≤중위 **또는** 1×1 저항 터치.",
        stopTarget: "히트에 없음.",
        notes: "차트용 1×2/2×1 팬도 그림. 히트는 존+1×1만.",
        params: "ATR unit · tol 0.8%+0.15ATR",
      },
    ],
  },
  {
    id: "ichimoku",
    label: "일목균형표",
    meta: "src/lib/ichimokuStrategyMeta.ts",
    detector: "src/lib/evaluation/ichimokuStrategies.ts",
    detectFn: "detectIchimokuStrategies",
    store: "src/lib/ichimokuStrategyStore.ts",
    help: "src/lib/ichimokuStrategyHelp.ts",
    hasStopTarget: false,
    overview: "일목 구성요소 교차·구름·합류. 전부 `ichimoku` 지표. stop/target 없음.",
    strategies: [
      {
        id: "ichi_tk_cross",
        label: "전환·기준선 호전·역전",
        summary: "전환선 × 기준선.",
        indicators: ["ichimoku"],
        bullish: "tenkan이 kijun을 상향 돌파 (호전).",
        bearish: "tenkan이 kijun을 하향 돌파 (역전).",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "표준 9/26",
      },
      {
        id: "ichi_chikou_cross",
        label: "후행스팬 호전·역전",
        summary: "현재 종가 vs displacement봉 전 고·저.",
        indicators: ["ichimoku"],
        bullish: "close가 (i−displacement)봉 high를 상향 돌파.",
        bearish: "close가 (i−displacement)봉 low를 하향 이탈.",
        stopTarget: "히트에 없음.",
        notes: "플롯된 chikou가 아니라 가격 vs 과거 H/L로 구현.",
        params: "displacement 기본 26",
      },
      {
        id: "ichi_kumo_twist",
        label: "구름 색 전환(비틀림)",
        summary: "SpanA × SpanB.",
        indicators: ["ichimoku"],
        bullish: "spanA가 spanB를 상향 (양운 전환).",
        bearish: "spanA가 spanB를 하향 (음운 전환).",
        stopTarget: "히트에 없음.",
        notes: "해당 날짜의 displaced span 값 사용.",
        params: "—",
      },
      {
        id: "ichi_price_kumo_break",
        label: "가격 구름 돌파·이탈",
        summary: "종가 vs 구름 상·하단.",
        indicators: ["ichimoku"],
        bullish: "close가 cloudTop=max(A,B) 상향 돌파.",
        bearish: "close가 cloudBot=min(A,B) 하향 이탈.",
        stopTarget: "히트에 없음.",
        notes: "구름이 두꺼울수록 신뢰↑ (서술, 코드 필터 아님).",
        params: "—",
      },
      {
        id: "ichi_trend_turn",
        label: "일목 추세 전환(4신호)",
        summary: "5봉 창에 4신호 합류.",
        indicators: ["ichimoku"],
        bullish:
          "TURN_WINDOW=5 안에 모두: (1) close>kijun 돌파 (2) TK 호전 (3) chikou 호전 (4) kumo twist 양운.",
        bearish: "동일 창에 4신호 모두 약세.",
        stopTarget: "히트에 없음.",
        notes: "창 안에 있으면 여러 봉에서 반복 가능.",
        params: "TURN_WINDOW 5",
      },
      {
        id: "ichi_breakout",
        label: "일목 돌파 매매",
        summary: "후행 돌파 + 장대봉 구름 돌파.",
        indicators: ["ichimoku"],
        bullish:
          "최근 6봉 chikou 호전 + |close−open|/range ≥ 0.55 양봉 + close가 cloudTop 돌파.",
        bearish: "chikou 역전 + 장대 음봉 + cloudBot 이탈.",
        stopTarget: "히트에 없음. 메타 손익비 2:1은 미연결.",
        notes: "",
        params: "chikou 창 6 · body/range ≥0.55",
      },
      {
        id: "ichi_kumo_sr",
        label: "구름 지지·저항",
        summary: "평평한 구름 터치 + 전환선 확인.",
        indicators: ["ichimoku"],
        bullish:
          "양운 + spanB 5봉 평탄(±0.15%) + low가 cloudBot 터치(두께 8% 패드) + 양봉 + close가 tenkan 상향.",
        bearish:
          "음운 + spanB 평탄 + high가 cloudTop 터치 + 음봉 + close가 tenkan 하향.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "flat 5봉 0.15% · 터치 패드 8%",
      },
    ],
  },
  {
    id: "volume",
    label: "거래량",
    meta: "src/lib/volumeStrategyMeta.ts",
    detector: "src/lib/evaluation/volumeStrategies.ts",
    detectFn: "detectVolumeStrategies",
    store: "src/lib/volumeStrategyStore.ts",
    help: "src/lib/volumeStrategyHelp.ts",
    hasStopTarget: false,
    overview:
      "거래량·VWAP·OBV/A-D/Chaikin/EOM 등. 히트에 stop/target 없음. EMA60/PSAR/volMA는 디텍터에서 인라인 계산하기도 함.",
    strategies: [
      {
        id: "heatmap_volume",
        label: "히트맵 볼륨",
        summary: "EMA60 + PSAR + 중간↑ 거래량.",
        indicators: ["ema", "psar", "volume", "volume_ma"],
        bullish:
          "PSAR 매수 플립(close가 PSAR 상향) + close > EMA60 + heat medium+(vol/SMA20 ≥ 0.5).",
        bearish: "PSAR 매도 플립 + close < EMA60 + medium+ heat.",
        stopTarget: "히트에 없음.",
        notes: "heat: ≥3 extra_high, ≥1.5 high, ≥0.5 medium. EMA60·PSAR·SMA20 인라인.",
        params: "EMA60 · PSAR 0.02/0.2 · volMA20",
      },
      {
        id: "volume_fight",
        label: "볼륨 파이트",
        summary: "EMA60 + PSAR + 매수/매도 우위.",
        indicators: ["ema", "psar", "volume"],
        bullish:
          "PSAR buy + above EMA60 + fight score > 0.05 (14봉 signed vol sum/abs).",
        bearish: "PSAR sell + below EMA60 + fight < −0.05.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "fight lookback 14 · 임계 ±0.05",
      },
      {
        id: "vsa",
        label: "VSA",
        summary: "강한 거래량 + EMA60 + PSAR.",
        indicators: ["ema", "psar", "volume", "volume_ma"],
        bullish: "vol > volMA20 AND heat high/extra_high AND PSAR buy + above EMA60.",
        bearish: "동일 vol 필터 + PSAR sell + below EMA60.",
        stopTarget: "히트에 없음.",
        notes: "heatmap보다 거래량 조건 강함.",
        params: "vol > MA20 · heat ≥1.5",
      },
      {
        id: "vwap_pullback",
        label: "VWAP 눌림목",
        summary: "추세 VWAP 터치 후 방향 재진입.",
        indicators: ["vwap"],
        bullish:
          "VWAP slope↑(3) + 상승구조(H&L > 5봉전) + VWAP 터치(±0.4%) + close≥VWAP + (양봉 or 해머).",
        bearish:
          "slope↓ + 하락구조 + 터치 + close≤VWAP + (음봉 or 슈팅스타).",
        stopTarget: "히트에 없음.",
        notes: "해머: 아랫심지 ≥1.5×body & ≥45% range.",
        params: "터치 ±0.4% · slope 3 · structure 5",
      },
      {
        id: "vwap_band_reversal",
        label: "VWAP 밴드 반전",
        summary: "±3σ(또는 ±2σ) 밴드 터치 후 반전.",
        indicators: ["vwap"],
        bullish: "low ≤ lower2(없으면 lower1) + 양봉 + close ≥ lower(밴드 안 복귀).",
        bearish: "high ≥ upper2 + 음봉 + close ≤ upper.",
        stopTarget: "히트에 없음.",
        notes: "워밍업 첫 10봉 스킵. ±3σ 우선.",
        params: "bands σ2/σ3",
      },
      {
        id: "vwap_switching",
        label: "VWAP 스위칭",
        summary: "가격·VWAP 기울기 반대 후 VWAP 방향.",
        indicators: ["vwap"],
        bullish: "5봉간 가격↓ & VWAP↑ + VWAP 근처(±0.6%) + 양봉/해머.",
        bearish: "가격↑ & VWAP↓ + 근처 + 음봉.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "switch 창 5 · near ±0.6%",
      },
      {
        id: "vwap_ema_squeeze",
        label: "VWAP·EMA 스키즈",
        summary: "VWAP≈EMA12 후 크로스.",
        indicators: ["vwap", "ema"],
        bullish:
          "|VWAP−EMA12|/|VWAP| ≤0.4%(현재 또는 직전) + 이미 ≥1.2% 벌어짐 아님 + EMA가 VWAP 상향 돌파 + VWAP slope↑ + close≥VWAP.",
        bearish: "스키즈 + EMA가 VWAP 하향 + slope↓ + close≤VWAP.",
        stopTarget: "히트에 없음.",
        notes: "ema:12 필요. 이미 크게 벌어진 뒤 진입 회피.",
        params: "squeeze ≤0.4% · wide ≥1.2%",
      },
      {
        id: "vwap_trendline",
        label: "VWAP·추세선",
        summary: "VWAP + 미깨진 추세선 합류.",
        indicators: ["vwap", "trendlines"],
        bullish: "VWAP±0.6% + 상승 TL±0.8%(미깨짐) + close≥VWAP + 양봉/해머.",
        bearish: "VWAP + 하락 TL + close≤VWAP + 음봉/슈팅.",
        stopTarget: "히트에 없음.",
        notes: "스코어 높은 선 사용, broken 스킵.",
        params: "VWAP±0.6% · TL±0.8%",
      },
      {
        id: "forever_vwap_flip",
        label: "포에버 VWAP 전환",
        summary: "forever VWAP flip + 장대봉.",
        indicators: ["forever_vwap"],
        bullish: "flip > 0 + body/range ≥0.55 양봉 + close ≥ forever VWAP.",
        bearish: "flip < 0 + 장대 음봉 + close ≤ VWAP.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "body/range ≥0.55",
      },
      {
        id: "failed_breakout_short",
        label: "실패 돌파 숏",
        summary: "실패 돌파 후 숏만.",
        indicators: ["vwap", "candle_patterns"],
        bullish: null,
        bearish:
          "i−2 양봉 시도가 8봉 신고가·VWAP 돌파 실패 + 직전 4봉 중 ≥2 윗꼬리 압력 + i−1 하락장악(패턴 또는 로컬) + i가 시도 저점 이탈.",
        stopTarget: "히트에 없음.",
        notes: "typicalDirection=bearish. 롱 없음.",
        params: "lookback 8 · wick ≥2/4",
      },
      {
        id: "obv_divergence",
        label: "OBV 다이버전스",
        summary: "가격 vs OBV 피벗 다이버전스.",
        indicators: ["obv", "pivots"],
        bullish: "피벗 L/R=2, 간격 3–40: 가격 LL + OBV HL → 2번째 피벗.",
        bearish: "가격 HH + OBV LH.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "피벗 2 · 3–40",
      },
      {
        id: "obv_keltner",
        label: "OBV+켈트너",
        summary: "KC 돌파 + OBV 방향.",
        indicators: ["obv", "keltner"],
        bullish: "close가 KC upper 상향 + OBV 3봉 상승.",
        bearish: "close가 KC lower 하향 + OBV 3봉 하락.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "OBV slope 3",
      },
      {
        id: "obv_fast_thrust",
        label: "패스트 OBV 추력",
        summary: "강한 OBV 에너지 + 가격 돌파.",
        indicators: ["obv"],
        bullish: "energy ≥55 + OBV>signal + close>직전 8봉 고 + 양봉.",
        bearish: "energy ≥55 + OBV<signal + close<8봉 저 + 음봉.",
        stopTarget: "히트에 없음.",
        notes: "obv / obvSignal / energy 사용.",
        params: "energy≥55 · thrust 8",
      },
      {
        id: "ad_divergence",
        label: "A/D 다이버전스",
        summary: "가격 vs A/D 다이버전스.",
        indicators: ["ad", "pivots"],
        bullish: "가격 LL + A/D HL (OBV div와 동일 피벗 규칙).",
        bearish: "가격 HH + A/D LH.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "피벗 2 · 3–40",
      },
      {
        id: "chaikin_zero",
        label: "Chaikin 0선",
        summary: "Chaikin 0선 크로스.",
        indicators: ["chaikin"],
        bullish: "chaikin이 0 상향 돌파.",
        bearish: "chaikin이 0 하향 돌파.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "fast 3 · slow 10",
      },
      {
        id: "chaikin_divergence",
        label: "Chaikin 다이버전스",
        summary: "가격 vs Chaikin 다이버전스.",
        indicators: ["chaikin", "pivots"],
        bullish: "가격 LL + Chaikin HL.",
        bearish: "가격 HH + Chaikin LH.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "피벗 2 · 3–40",
      },
      {
        id: "equivolume_oversquare",
        label: "EquiVolume 뚱보형",
        summary: "스윙 고/저에서 oversquare.",
        indicators: ["equivolume", "pivots"],
        bullish: "shape==3(oversquare) at local low.",
        bearish: "shape==3 at local high.",
        stopTarget: "히트에 없음.",
        notes: "차트 맥락으로 eom 권장되나 디텍터는 shape만.",
        params: "shape 3",
      },
      {
        id: "eom_zero",
        label: "EOM 0선",
        summary: "EOM 스무스 0선 크로스.",
        indicators: ["eom"],
        bullish: "eomSmooth(없으면 eom) 0 상향.",
        bearish: "0 하향.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "period 14",
      },
    ],
  },
  {
    id: "rsi",
    label: "RSI",
    meta: "src/lib/rsiStrategyMeta.ts",
    detector: "src/lib/evaluation/rsiStrategies.ts",
    detectFn: "detectRsiStrategies",
    store: "src/lib/rsiStrategyStore.ts",
    help: "src/lib/rsiStrategyHelp.ts",
    hasStopTarget: false,
    overview: "RSI / 슈퍼 RSI / 이중 RSI. stop/target 없음.",
    strategies: [
      {
        id: "rsi_classic_obos",
        label: "고전 RSI 과매수·과매도",
        summary: "고정 70/30 돌파·이탈.",
        indicators: ["rsi"],
        bullish: "RSI가 oversold(기본 30)를 상향 돌파.",
        bearish: "RSI가 overbought(기본 70)를 하향 이탈.",
        stopTarget: "히트에 없음.",
        notes: "추세장 실패 잦음. config OB/OS 사용.",
        params: "OB/OS from config (70/30)",
      },
      {
        id: "super_rsi_obos",
        label: "슈퍼 RSI 유동 과매수·과매도",
        summary: "가중 RSI × 유동 밴드.",
        indicators: ["rsi"],
        bullish: "rsiWeighted가 rsiLower를 상향 돌파.",
        bearish: "rsiWeighted가 rsiUpper를 하향 이탈.",
        stopTarget: "히트에 없음.",
        notes: "슈퍼 RSI = 가중 RSI + BB on RSI.",
        params: "rsiWeighted / Upper / Lower",
      },
      {
        id: "super_rsi_squeeze_mid",
        label: "슈퍼 RSI 수렴→중심선 돌파",
        summary: "밴드 수렴 후 mid 돌파.",
        indicators: ["rsi"],
        bullish:
          "직전 ≥3봉 bandwidth percentile ≤0.25 + 확장(rankNow>rankPrev & rankPrev≤0.3) + weighted가 mid 상향.",
        bearish: "동일 스퀴즈/확장 + weighted mid 하향.",
        stopTarget: "히트에 없음.",
        notes: "bandwidth = rsiUpper−rsiLower.",
        params: "percentile ≤0.25 · ≥3봉",
      },
      {
        id: "rsi_divergence",
        label: "RSI 다이버전스",
        summary: "가격 vs RSI 피벗 다이버전스.",
        indicators: ["rsi", "pivots"],
        bullish: "피벗 3–40: 가격 LL + RSI > 이전 RSI+1 → 2번째 저점.",
        bearish: "가격 HH + RSI < 이전−1.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "피벗 · RSI Δ≥1",
      },
      {
        id: "double_rsi_cross",
        label: "이중 RSI 교차",
        summary: "RSI(7) × RSI(21).",
        indicators: ["rsi"],
        bullish: "인라인 RSI(7)이 RSI(21) 상향 돌파.",
        bearish: "RSI(7)이 RSI(21) 하향.",
        stopTarget: "히트에 없음.",
        notes: "플러그인 시리즈가 아니라 technicalindicators로 인라인 계산. 추세장 유리.",
        params: "RSI 7 / 21",
      },
    ],
  },
  {
    id: "macd",
    label: "MACD",
    meta: "src/lib/macdStrategyMeta.ts",
    detector: "src/lib/evaluation/macdStrategies.ts",
    detectFn: "detectMacdStrategies",
    store: "src/lib/macdStrategyStore.ts",
    help: "src/lib/macdStrategyHelp.ts",
    hasStopTarget: false,
    overview: "시그널/0선/RSI확인/다이버전스/추세돌파. stop/target 없음.",
    strategies: [
      {
        id: "macd_signal_cross",
        label: "시그널 선 크로스",
        summary: "MACD × signal.",
        indicators: ["macd"],
        bullish: "MACD가 signal 상향(골든). macd>0이면 summary에 신뢰↑ 표기.",
        bearish: "MACD가 signal 하향(데드). macd<0 표기.",
        stopTarget: "히트에 없음.",
        notes: "0선 위치는 정보일 뿐, 신호는 양쪽 모두 발생.",
        params: "12/26/9",
      },
      {
        id: "macd_zero_line",
        label: "기준선(0선) 매매",
        summary: "0선 돌파 또는 눌림 재진입.",
        indicators: ["macd"],
        bullish:
          "MACD 0 상향 **또는** 0상향 후 20봉 내 여전히 >0, signal 근처(|diff|≤max(15%*|sig|,1e-6))에서 골든(눌림 재진입).",
        bearish: "0 하향 **또는** 20봉 내 눌림 재숏.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "재진입 창 20 · near 15%",
      },
      {
        id: "macd_rsi_confirm",
        label: "과매수·과매도 확인",
        summary: "RSI 탈출 후 MACD 크로스.",
        indicators: ["macd", "rsi"],
        bullish: "최근 8봉 내 RSI가 30 상향 후 MACD 골든.",
        bearish: "최근 8봉 내 RSI가 **80** 하향 후 MACD 데드.",
        stopTarget: "히트에 없음.",
        notes: "숏 쪽 RSI는 70이 아니라 80.",
        params: "RSI 창 8 · OS30 / OB80",
      },
      {
        id: "macd_divergence",
        label: "MACD 다이버전스",
        summary: "다이버전스 후 시그널 확인.",
        indicators: ["macd", "pivots"],
        bullish: "가격 LL + MACD HL (피벗 3–40). 2번째 피벗 후 10봉 내 골든.",
        bearish: "가격 HH + MACD LH 후 10봉 내 데드.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "확인 창 10",
      },
      {
        id: "macd_trend_break",
        label: "MACD 돌파 매매",
        summary: "가격·MACD·시그널 추세선 동시 돌파.",
        indicators: ["macd", "pivots"],
        bullish:
          "최근 40봉 내 하락 스윙 고 2개. close가 고점 추세선 돌파 + MACD·signal이 각자 추세선 위 + 골든 또는 macd>signal.",
        bearish:
          "상승 스윙 저 2개. close 지지 이탈 + MACD·signal 추세선 아래 + 데드 또는 macd<signal.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "lookback 40",
      },
    ],
  },
  {
    id: "stoch",
    label: "스토캐스틱",
    meta: "src/lib/stochStrategyMeta.ts",
    detector: "src/lib/evaluation/stochStrategies.ts",
    detectFn: "detectStochStrategies",
    store: "src/lib/stochStrategyStore.ts",
    help: "src/lib/stochStrategyHelp.ts",
    hasStopTarget: false,
    overview: "%K/%D + SMA20 / S·R / 3중바닥. stop/target 없음.",
    strategies: [
      {
        id: "stoch_ma20_cross",
        label: "스토캐 + 20이평",
        summary: "SMA20 추세 + %K/%D 크로스.",
        indicators: ["stoch", "sma"],
        bullish:
          "close > sma20×0.998 + SMA20 근처(mid 2% 또는 low≤sma×1.005) + %K/%D 골든.",
        bearish: "close < sma20×1.002 + 위에서 근처 + %K/%D 데드.",
        stopTarget: "히트에 없음.",
        notes: "sma:20 필요.",
        params: "near SMA20 2%",
      },
      {
        id: "stoch_divergence",
        label: "스토캐 다이버전스",
        summary: "가격 vs %K 다이버전스 + 크로스 확인.",
        indicators: ["stoch", "pivots"],
        bullish:
          "가격 LL + %K HL, 첫 피벗 %K≤OS(20). 2번째 피벗 후 10봉 내 골든.",
        bearish: "가격 HH + %K LH, 첫 %K≥OB(80). 10봉 내 데드.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "확인 10 · OB/OS 80/20",
      },
      {
        id: "stoch_sr_bounce",
        label: "스토캐 지지·저항",
        summary: "S/R 존 + %K OB/OS 이탈.",
        indicators: ["stoch", "support_resistance"],
        bullish: "미깨진 지지(터치≥2) 근처 + %K가 OS(20) 상향.",
        bearish: "미깨진 저항 근처 + %K가 OB(80) 하향.",
        stopTarget: "히트에 없음.",
        notes: "존 패드 = max(반높이, mid×0.4%).",
        params: "touches≥2 · OS/OB 20/80",
      },
      {
        id: "stoch_triple_bottom",
        label: "스토캐 3중 바닥",
        summary: "%K 3중 바닥/천장 후 크로스.",
        indicators: ["stoch"],
        bullish: "최근 50봉 %K 로컬 저 3개가 상승 + 마지막 저 후 8봉 내 골든.",
        bearish: "%K 로컬 고 3개 하락 + 8봉 내 데드 (3중 천장).",
        stopTarget: "히트에 없음.",
        notes: "같은 id의 약세 분기가 3중 천장.",
        params: "lookback 50 · 확인 8",
      },
    ],
  },
  {
    id: "pattern",
    label: "차트 패턴",
    meta: "src/lib/patternStrategyMeta.ts",
    detector: "src/lib/evaluation/patternStrategies.ts",
    detectFn: "detectPatternStrategies",
    store: "src/lib/patternStrategyStore.ts",
    help: "src/lib/patternStrategyHelp.ts",
    hasStopTarget: true,
    overview:
      "고전 차트 패턴 인스턴스 기반. **유일하게 히트에 stopPrice/targetPrice** (measured move).",
    strategies: [
      {
        id: "breakout_entry",
        label: "목선·레벨 돌파 진입",
        summary: "확정 패턴 돌파봉 즉시 진입.",
        indicators: ["chart_patterns", "volume"],
        bullish: "status=confirmed 강세 패턴의 entryBar.",
        bearish: "확정 약세 패턴 entryBar.",
        stopTarget:
          "pattern stop/target via levelsFromPattern. rewardRisk·rrMethod=pattern.",
        notes: "공격적. volume은 패턴 엔진/표시와 연관.",
        params: "confirm bar",
      },
      {
        id: "retest_entry",
        label: "리테스트 안전 진입",
        summary: "돌파 후 레벨 재테스트 확인.",
        indicators: ["chart_patterns"],
        bullish:
          "강세 돌파 후 12봉 내 목선/레벨 터치(레벨+패턴높이 기반 tol, RETEST_ATR_FRAC=0.35) + 양봉 close≥level.",
        bearish: "약세 돌파 후 터치 + 음봉 close≤level (12봉).",
        stopTarget: "pattern levels.",
        notes: "안정적 진입.",
        params: "retest 창 12 · ATR frac 0.35",
      },
      {
        id: "volume_breakout",
        label: "거래량 확인 돌파",
        summary: "돌파 + 거래량 ≥1.35×20봉 평균.",
        indicators: ["chart_patterns", "volume"],
        bullish: "breakout_entry와 동일 + entryBar vol ≥ 1.35 × prior20 avg.",
        bearish: "동일 필터의 약세.",
        stopTarget: "pattern levels.",
        notes: "",
        params: "vol ≥1.35×MA20",
      },
      {
        id: "triple_confirm",
        label: "삼중 확인 진입",
        summary: "돌파+거래량+리테스트 모두.",
        indicators: ["chart_patterns", "volume"],
        bullish: "volume_breakout 조건 + 같은 인스턴스 retest 성공 → retest봉 히트.",
        bearish: "동일.",
        stopTarget: "pattern levels.",
        notes: "가장 엄격.",
        params: "세 조건 AND",
      },
      {
        id: "fake_breakout",
        label: "가짜 돌파 경고",
        summary: "돌파 실패 → 반대 방향 경고.",
        indicators: ["chart_patterns"],
        bullish:
          "약세 패턴 확정 후 15봉 내 close가 레벨을 반대 관통 → 강세 경고(failDir).",
        bearish: "강세 확정 후 15봉 내 close < level−tol → 약세 가짜 경고.",
        stopTarget:
          "히트에 패턴 필드는 남을 수 있으나 levelsFromPattern 재작성 스킵(경고용).",
        notes: "주력 진입 시스템 아님. 반대 경고.",
        params: "fail 창 15",
      },
    ],
  },
  {
    id: "combo",
    label: "복합 지표",
    meta: "src/lib/comboStrategyMeta.ts",
    detector: "src/lib/evaluation/comboStrategies.ts",
    detectFn: "detectComboStrategies",
    store: "src/lib/comboStrategyStore.ts",
    help: "src/lib/comboStrategyHelp.ts",
    hasStopTarget: false,
    overview: "멀티 지표 합류. stop/target 없음. relatedAux로 차트 레이어 연동.",
    strategies: [
      {
        id: "st_adx",
        label: "슈퍼트렌드+ADX",
        summary: "강한 추세에서만 ST 전환.",
        indicators: ["supertrend", "adx", "atr"],
        bullish: "ADX > 25 + ST direction → +1 + close > ST.",
        bearish: "ADX > 25 + ST → −1 + close < ST.",
        stopTarget: "히트에 없음. atr는 차트 relatedAux.",
        notes: "횡보 노이즈 감소.",
        params: "ADX>25",
      },
      {
        id: "kc_cci",
        label: "켈트너+CCI",
        summary: "ATR 확대 + KC 돌파 + CCI ±100.",
        indicators: ["keltner", "cci", "atr"],
        bullish:
          "ATR / SMA20(ATR) ≥ 1.05 + close가 KC upper 상향 + CCI가 +100 상향.",
        bearish: "ATR ratio ≥1.05 + KC lower 하향 + CCI −100 하향.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "ATR ratio ≥1.05 · CCI ±100",
      },
      {
        id: "vwap_flow",
        label: "VWAP자금흐름",
        summary: "VWAP + MFI + OBV 합류.",
        indicators: ["vwap", "mfi", "obv"],
        bullish:
          "VWAP±0.6% + close≥VWAP + 양봉 + MFI>50 & 3봉↑ + OBV가 20봉 고.",
        bearish: "근처 + close≤VWAP + 음봉 + MFI<50 하락 + OBV 20봉 저.",
        stopTarget: "히트에 없음.",
        notes: "",
        params: "near ±0.6% · MFI slope 3 · OBV N=20",
      },
      {
        id: "pctb_mean_reversion",
        label: "%B평균회귀",
        summary: "약한 추세·낮은 ATR에서 밴드 밖 회귀.",
        indicators: ["bb", "cci", "atr", "adx"],
        bullish: "ADX < 20 AND ATR ratio < 1.3 AND %B ≤ 0 AND CCI ≤ −100.",
        bearish: "동일 필터 + %B ≥ 1 AND CCI ≥ 100.",
        stopTarget: "히트에 없음.",
        notes: "강한 추세/ATR 급등 회피. relatedAux bbPercentB.",
        params: "ADX<20 · ATR ratio<1.3",
      },
      {
        id: "psar_adx",
        label: "PSAR+ADX",
        summary: "ADX 필터 + PSAR 플립.",
        indicators: ["psar", "adx", "atr"],
        bullish: "ADX > 20 + close가 PSAR 아래→위 교차.",
        bearish: "ADX > 20 + close가 PSAR 위→아래.",
        stopTarget: "히트에 없음. atr는 차트용.",
        notes: "",
        params: "ADX>20",
      },
      {
        id: "obv_div_st",
        label: "OBV다이버전스+ST",
        summary: "OBV 다이버전스 후 ST 확인.",
        indicators: ["obv", "supertrend", "mfi", "pivots"],
        bullish:
          "가격 LL + OBV HL (피벗 3–40). 8봉 내 ST → +1. 같은 피벗에 MFI 상승 다이버전스면 summary 강화.",
        bearish: "가격 HH + OBV LH + 8봉 내 ST → −1 (+ optional MFI).",
        stopTarget: "히트에 없음.",
        notes: "MFI는 선택 확인.",
        params: "ST 확인 창 8",
      },
    ],
  },
];

function writeIndicatorsCatalog() {
  ensureDir(indRoot);
  const byCat = Object.fromEntries(CATEGORY_ORDER.map(([c]) => [c, []]));
  for (const ind of Object.values(INDICATORS)) {
    (byCat[ind.category] ?? (byCat[ind.category] = [])).push(ind);
  }

  // reverse index: indicator -> strategies
  /** @type {Record<string, Array<{family:string,id:string,label:string}>>} */
  const usedBy = {};
  for (const f of families) {
    for (const s of f.strategies) {
      for (const id of s.indicators) {
        (usedBy[id] ??= []).push({ family: f.id, id: s.id, label: s.label });
      }
    }
  }

  let body = `# 기술지표 카탈로그 (labeled)

Local-only (\`docs/\` gitignored). Agent entry: [docs/README.md](../README.md) · strategies: [strategies/INDEX.md](../strategies/INDEX.md)

전략 문서에서 지표는 **라벨 id**로 표기합니다. 예: \`rsi\`, \`bb\`, \`vwap\`.

## 라벨 빠른 표

| label | 이름(KO) | 카테고리 | kind |
|-------|----------|----------|------|
${Object.values(INDICATORS)
  .map(
    (i) =>
      `| \`${i.id}\` | ${i.nameKo} | ${i.category} | ${i.kind} |`,
  )
  .join("\n")}

`;

  for (const [cat, title] of CATEGORY_ORDER) {
    const list = byCat[cat] ?? [];
    if (!list.length) continue;
    body += `\n## ${title}\n\n`;
    for (const i of list) {
      const users = usedBy[i.id] ?? [];
      body += `### \`${i.id}\` — ${i.nameKo}\n\n`;
      body += `- **EN:** ${i.nameEn}\n`;
      body += `- **What:** ${i.what}\n`;
      body += `- **Params:** ${i.params}\n`;
      body += `- **Series:** \`${i.series}\`\n`;
      body += `- **Code:** \`${i.file}\`\n`;
      body += `- **Kind:** ${i.kind}\n`;
      if (users.length) {
        body += `- **Used by (${users.length}):** ${users
          .map(
            (u) =>
              `[\`${u.id}\`](../strategies/${u.family}/${u.id}.md)`,
          )
          .join(", ")}\n`;
      } else {
        body += `- **Used by:** _(none — unused by playbooks)_\n`;
      }
      body += `\n`;
    }
  }

  body += `## 공유 규칙

| 항목 | 내용 |
|------|------|
| 플러그인 레지스트리 | \`src/lib/evaluation/registry.ts\` ← \`allPlugins\` |
| 차트 레이어 deps | \`src/lib/strategyIndicatorDeps.ts\` |
| 비패턴 RR | ATR×1.5 손절 + 2R 익절 (\`riskReward.ts\`) |
| 패턴 RR | \`chart_patterns\` measured move stop/target |

## 미사용 플러그인

- \`obvMid\` — 등록만, 전략 deps 없음
`;

  fs.writeFileSync(path.join(indRoot, "INDEX.md"), body, "utf8");
}

function strategyDoc(family, s) {
  const indBadges = badge(s.indicators);
  return `# ${s.label} (\`${s.id}\`)

> Family: **${family.label}** (\`${family.id}\`) · [strategies INDEX](../INDEX.md) · [indicators](../../indicators/INDEX.md)

## Summary

${s.summary}

## Indicator labels

${indBadges}

| label | KO | EN |
|-------|----|----|
${indTable(s.indicators)}

지표 상세: [indicators/INDEX.md](../../indicators/INDEX.md)

## Entry rules (as coded)

### Bullish (매수)
${s.bullish ?? "_없음_"}

### Bearish (매도/숏)
${s.bearish ?? "_없음 (이 전략은 해당 방향 미발생)_"}

### Key params
${s.params}

## Exit / invalidation

${s.stopTarget}

## Notes

${s.notes || "—"}

## Code map

| Role | Path |
|------|------|
| Detector | \`${family.detector}\` → \`${family.detectFn}\` (id \`${s.id}\`) |
| Meta | \`${family.meta}\` |
| Store | \`${family.store}\` |
| Help | \`${family.help}\` |
| Catalog | \`src/lib/strategyCatalog.ts\` |
| Orchestration | \`src/lib/evaluation/evaluateQuote.ts\` |
| Layer deps | \`src/lib/strategyIndicatorDeps.ts\` |

## Gaps

- [ ] 전략별 무효화 손절가 (가설 실패 가격) — pattern 제외 대부분 미구현
- [ ] 라이브 마커에 페어 청산(반대시그널/익절) — 백테스트·RR 오버레이만 존재
`;
}

function familyReadme(family) {
  const rows = family.strategies
    .map(
      (s) =>
        `| \`${s.id}\` | ${s.label} | ${badge(s.indicators)} | [doc](./${s.id}.md) |`,
    )
    .join("\n");
  return `# ${family.label} (\`${family.id}\`)

> [strategies INDEX](../INDEX.md) · [indicators](../../indicators/INDEX.md)

${family.overview}

## Code

| Role | Path |
|------|------|
| Detector | \`${family.detector}\` → \`${family.detectFn}\` |
| Meta | \`${family.meta}\` |
| Store | \`${family.store}\` |
| Help | \`${family.help}\` |

**stop/target on hits:** ${family.hasStopTarget ? "yes (pattern)" : "no"}

## Strategies

| id | label | indicators | doc |
|----|-------|------------|-----|
${rows}
`;
}

function strategiesIndex() {
  const total = families.reduce((n, f) => n + f.strategies.length, 0);
  const familyRows = families
    .map(
      (f) =>
        `| \`${f.id}\` | ${f.label} | ${f.strategies.length} | [family](./${f.id}/README.md) | \`${f.detector}\` |`,
    )
    .join("\n");
  const flat = families
    .flatMap((f) =>
      f.strategies.map(
        (s) =>
          `| \`${f.id}\` | \`${s.id}\` | ${s.label} | ${badge(s.indicators)} | [doc](./${f.id}/${s.id}.md) |`,
      ),
    )
    .join("\n");

  return `# Strategy index (agent)

Local-only. Labels/rules text source of truth: \`*StrategyMeta.ts\`.  
**Indicators catalog:** [../indicators/INDEX.md](../indicators/INDEX.md)

## Quick start

1. Find strategy in flat table (id + **indicator labels**).
2. Open doc for full entry rules + code map.
3. Indicator definitions: \`docs/indicators/INDEX.md\`.
4. Edit: detector + meta; refresh docs via \`node scripts/gen-strategy-docs.mjs\`.

## Families (${families.length} · ${total} strategies)

| family | label | count | index | detector |
|--------|-------|------:|-------|----------|
${familyRows}

## Flat: id → indicators → doc

| family | id | label | indicators | doc |
|--------|----|-------|------------|-----|
${flat}

## Shared modules

| Role | Path |
|------|------|
| Catalog | \`src/lib/strategyCatalog.ts\` |
| Evaluate | \`src/lib/evaluation/evaluateQuote.ts\` |
| Indicator plugins | \`src/lib/evaluation/indicators/\` |
| Layer deps | \`src/lib/strategyIndicatorDeps.ts\` |
| RR | \`src/lib/evaluation/riskReward.ts\` |
| Playbook BT | \`src/lib/evaluation/playbookBacktest.ts\` |

## Exit model

| Context | Exit |
|---------|------|
| Live markers | Independent bullish/bearish only |
| Pattern hits | \`stopPrice\` / \`targetPrice\` |
| Other hits | No per-strategy stop; RR = ATR×1.5 + 2R |
| Playbook BT | ±1.5% / opposite / horizon 12 |
`;
}

function readme() {
  return `# docs/ (local, gitignored)

## Agent start

1. **[indicators/INDEX.md](./indicators/INDEX.md)** — 기술지표 라벨 카탈로그
2. **[strategies/INDEX.md](./strategies/INDEX.md)** — 전략 id → 지표 라벨 → 문서 → 코드
3. \`strategies/{family}/{id}.md\` — 전략별 상세 (진입 규칙 + 지표 라벨)

## Regenerate

\`\`\`bash
node scripts/gen-strategy-docs.mjs
\`\`\`

## Code truth

| What | Where |
|------|--------|
| Catalog | \`src/lib/strategyCatalog.ts\` |
| Detectors | \`src/lib/evaluation/*Strategies.ts\` |
| Meta | \`src/lib/*StrategyMeta.ts\` |
| Indicators | \`src/lib/evaluation/indicators/\` |
| Deps | \`src/lib/strategyIndicatorDeps.ts\` |
`;
}

function updateCursorRule() {
  const rulePath = path.join(root, ".cursor", "rules", "strategy-docs.mdc");
  if (!fs.existsSync(path.dirname(rulePath))) return;
  const content = `---
description: Where trading strategy docs and indicator labels live (local docs/)
alwaysApply: true
---

# Strategy & indicator docs

Local docs under \`docs/\` (**gitignored**).

## Agent entry

1. \`docs/indicators/INDEX.md\` — **labeled technical indicators** (\`rsi\`, \`bb\`, \`vwap\`, …)
2. \`docs/strategies/INDEX.md\` — every strategy id → **indicator labels** → doc → detector
3. \`docs/strategies/{family}/{id}.md\` — detailed entry rules + indicator table

If missing:

\`\`\`bash
node scripts/gen-strategy-docs.mjs
\`\`\`

## Code source of truth

| What | Where |
|------|--------|
| Catalog | \`src/lib/strategyCatalog.ts\` |
| Detectors | \`src/lib/evaluation/*Strategies.ts\` |
| Meta | \`src/lib/*StrategyMeta.ts\` |
| Indicators | \`src/lib/evaluation/indicators/\` |
| Layer deps | \`src/lib/strategyIndicatorDeps.ts\` |
| Orchestration | \`src/lib/evaluation/evaluateQuote.ts\` |
`;
  fs.writeFileSync(rulePath, content, "utf8");
}

// --- main ---
ensureDir(docsRoot);
ensureDir(stratRoot);
writeIndicatorsCatalog();
fs.writeFileSync(path.join(docsRoot, "README.md"), readme(), "utf8");
fs.writeFileSync(path.join(stratRoot, "INDEX.md"), strategiesIndex(), "utf8");

for (const family of families) {
  const dir = path.join(stratRoot, family.id);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "README.md"), familyReadme(family), "utf8");
  for (const s of family.strategies) {
    fs.writeFileSync(path.join(dir, `${s.id}.md`), strategyDoc(family, s), "utf8");
  }
}

updateCursorRule();

const count = families.reduce((n, f) => n + f.strategies.length, 0);
const indCount = Object.keys(INDICATORS).length;
console.log(
  `Wrote indicators catalog (${indCount} labels), ${families.length} families, ${count} strategy docs.`,
);
