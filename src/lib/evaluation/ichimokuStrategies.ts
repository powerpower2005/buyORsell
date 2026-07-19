import type { IndicatorResults, OHLCVBar, SeriesPoint, TrendLabel } from "../types";
import {
  ICHIMOKU_STRATEGY_META,
  type IchimokuStrategyId,
} from "../ichimokuStrategyMeta";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export type { IchimokuStrategyId };

export interface IchimokuStrategyHit {
  id: IchimokuStrategyId;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface IchimokuStrategyResult {
  lookbackBars: number;
  latestBarDate: string;
  onLatestBar: IchimokuStrategyHit[];
  recent: IchimokuStrategyHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 120;
const MAX_HITS_PER_STRATEGY = 10;
const TURN_WINDOW = 5;

interface Frame {
  tenkan: number | null;
  kijun: number | null;
  spanA: number | null;
  spanB: number | null;
  cloudTop: number | null;
  cloudBot: number | null;
  bullCloud: boolean | null;
  thickness: number | null;
}

function mapSeries(points: SeriesPoint[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!points) return out;
  for (const p of points) out.set(p.date, p.value);
  return out;
}

function hit(
  id: IchimokuStrategyId,
  barIndex: number,
  bars: OHLCVBar[],
  direction: TrendLabel,
  summary: string,
): IchimokuStrategyHit {
  return {
    id,
    label: ICHIMOKU_STRATEGY_META[id].labelKo,
    date: bars[barIndex]!.date,
    barIndex,
    direction,
    summary,
  };
}

function spanBFlat(frames: Array<Frame | null>, i: number, n = 5): boolean {
  const cur = frames[i]?.spanB;
  if (cur == null) return false;
  for (let k = i - n + 1; k < i; k++) {
    if (k < 0) return false;
    const v = frames[k]?.spanB;
    if (v == null || Math.abs(v - cur) > cur * 0.0015) return false;
  }
  return true;
}

function detectTkCross(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (
      !cur ||
      !prev ||
      cur.tenkan == null ||
      cur.kijun == null ||
      prev.tenkan == null ||
      prev.kijun == null
    ) {
      continue;
    }
    if (prev.tenkan <= prev.kijun && cur.tenkan > cur.kijun) {
      hits.push(
        hit("ichi_tk_cross", i, bars, "bullish", "전환선이 기준선 상향 돌파(호전)"),
      );
    } else if (prev.tenkan >= prev.kijun && cur.tenkan < cur.kijun) {
      hits.push(
        hit("ichi_tk_cross", i, bars, "bearish", "전환선이 기준선 하향 돌파(역전)"),
      );
    }
  }
  return hits;
}

function detectChikouCross(
  bars: OHLCVBar[],
  displacement: number,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, displacement + 1); i < bars.length; i++) {
    const past = i - displacement;
    const prevClose = bars[i - 1]!.close;
    const curClose = bars[i]!.close;
    const pastHigh = bars[past]!.high;
    const pastLow = bars[past]!.low;
    if (prevClose <= pastHigh && curClose > pastHigh) {
      hits.push(
        hit(
          "ichi_chikou_cross",
          i,
          bars,
          "bullish",
          "후행스팬이 과거 캔들 상향 돌파",
        ),
      );
    } else if (prevClose >= pastLow && curClose < pastLow) {
      hits.push(
        hit(
          "ichi_chikou_cross",
          i,
          bars,
          "bearish",
          "후행스팬이 과거 캔들 하향 이탈",
        ),
      );
    }
  }
  return hits;
}

function detectKumoTwist(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (
      !cur ||
      !prev ||
      cur.spanA == null ||
      cur.spanB == null ||
      prev.spanA == null ||
      prev.spanB == null
    ) {
      continue;
    }
    if (prev.spanA <= prev.spanB && cur.spanA > cur.spanB) {
      hits.push(
        hit("ichi_kumo_twist", i, bars, "bullish", "음운→양운 구름 색 전환"),
      );
    } else if (prev.spanA >= prev.spanB && cur.spanA < cur.spanB) {
      hits.push(
        hit("ichi_kumo_twist", i, bars, "bearish", "양운→음운 구름 색 전환"),
      );
    }
  }
  return hits;
}

function detectPriceKumoBreak(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, 1); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev || cur.cloudTop == null || cur.cloudBot == null) continue;
    if (prev.cloudTop == null || prev.cloudBot == null) continue;
    const prevClose = bars[i - 1]!.close;
    const close = bars[i]!.close;
    if (prevClose <= prev.cloudTop && close > cur.cloudTop) {
      hits.push(
        hit(
          "ichi_price_kumo_break",
          i,
          bars,
          "bullish",
          "종가가 구름 상단 돌파",
        ),
      );
    } else if (prevClose >= prev.cloudBot && close < cur.cloudBot) {
      hits.push(
        hit(
          "ichi_price_kumo_break",
          i,
          bars,
          "bearish",
          "종가가 구름 하단 이탈",
        ),
      );
    }
  }
  return hits;
}

function recentEvent(
  events: Array<{ i: number; dir: "bullish" | "bearish" }>,
  end: number,
  dir: "bullish" | "bearish",
  window: number,
): boolean {
  return events.some((e) => e.dir === dir && e.i <= end && e.i >= end - window);
}

function detectTrendTurn(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  displacement: number,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  const tk: Array<{ i: number; dir: "bullish" | "bearish" }> = [];
  const ck: Array<{ i: number; dir: "bullish" | "bearish" }> = [];
  const twist: Array<{ i: number; dir: "bullish" | "bearish" }> = [];
  const kijunX: Array<{ i: number; dir: "bullish" | "bearish" }> = [];

  for (let i = Math.max(1, start - TURN_WINDOW); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev) continue;
    if (
      cur.tenkan != null &&
      cur.kijun != null &&
      prev.tenkan != null &&
      prev.kijun != null
    ) {
      if (prev.tenkan <= prev.kijun && cur.tenkan > cur.kijun) {
        tk.push({ i, dir: "bullish" });
      } else if (prev.tenkan >= prev.kijun && cur.tenkan < cur.kijun) {
        tk.push({ i, dir: "bearish" });
      }
    }
    if (cur.spanA != null && cur.spanB != null && prev.spanA != null && prev.spanB != null) {
      if (prev.spanA <= prev.spanB && cur.spanA > cur.spanB) {
        twist.push({ i, dir: "bullish" });
      } else if (prev.spanA >= prev.spanB && cur.spanA < cur.spanB) {
        twist.push({ i, dir: "bearish" });
      }
    }
    if (cur.kijun != null && prev.kijun != null) {
      if (bars[i - 1]!.close <= prev.kijun && bars[i]!.close > cur.kijun) {
        kijunX.push({ i, dir: "bullish" });
      } else if (bars[i - 1]!.close >= prev.kijun && bars[i]!.close < cur.kijun) {
        kijunX.push({ i, dir: "bearish" });
      }
    }
    if (i >= displacement + 1) {
      const past = i - displacement;
      const pastHigh = bars[past]!.high;
      const pastLow = bars[past]!.low;
      if (bars[i - 1]!.close <= pastHigh && bars[i]!.close > pastHigh) {
        ck.push({ i, dir: "bullish" });
      } else if (bars[i - 1]!.close >= pastLow && bars[i]!.close < pastLow) {
        ck.push({ i, dir: "bearish" });
      }
    }
  }

  for (let i = Math.max(start, TURN_WINDOW); i < bars.length; i++) {
    if (
      recentEvent(kijunX, i, "bullish", TURN_WINDOW) &&
      recentEvent(tk, i, "bullish", TURN_WINDOW) &&
      recentEvent(ck, i, "bullish", TURN_WINDOW) &&
      recentEvent(twist, i, "bullish", TURN_WINDOW)
    ) {
      hits.push(
        hit(
          "ichi_trend_turn",
          i,
          bars,
          "bullish",
          "4신호 상승 추세 전환 확인",
        ),
      );
    } else if (
      recentEvent(kijunX, i, "bearish", TURN_WINDOW) &&
      recentEvent(tk, i, "bearish", TURN_WINDOW) &&
      recentEvent(ck, i, "bearish", TURN_WINDOW) &&
      recentEvent(twist, i, "bearish", TURN_WINDOW)
    ) {
      hits.push(
        hit(
          "ichi_trend_turn",
          i,
          bars,
          "bearish",
          "4신호 하락 추세 전환 확인",
        ),
      );
    }
  }
  return hits;
}

function detectBreakout(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  displacement: number,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, displacement + 2); i < bars.length; i++) {
    const cur = frames[i];
    if (!cur || cur.cloudTop == null || cur.cloudBot == null) continue;
    const bar = bars[i]!;
    const range = bar.high - bar.low;
    if (!(range > 0)) continue;
    const body = Math.abs(bar.close - bar.open);
    const strong = body / range >= 0.55;

    // Look back for recent chikou cross
    let bullCk = false;
    let bearCk = false;
    for (let k = i; k >= Math.max(0, i - 6); k--) {
      const past = k - displacement;
      if (past < 0 || k < 1) continue;
      if (bars[k - 1]!.close <= bars[past]!.high && bars[k]!.close > bars[past]!.high) {
        bullCk = true;
      }
      if (bars[k - 1]!.close >= bars[past]!.low && bars[k]!.close < bars[past]!.low) {
        bearCk = true;
      }
    }

    const prev = frames[i - 1];
    if (
      bullCk &&
      strong &&
      bar.close > bar.open &&
      prev?.cloudTop != null &&
      bars[i - 1]!.close <= prev.cloudTop &&
      bar.close > cur.cloudTop
    ) {
      hits.push(
        hit(
          "ichi_breakout",
          i,
          bars,
          "bullish",
          "후행 돌파 후 장대양봉 구름 상단 돌파",
        ),
      );
    } else if (
      bearCk &&
      strong &&
      bar.close < bar.open &&
      prev?.cloudBot != null &&
      bars[i - 1]!.close >= prev.cloudBot &&
      bar.close < cur.cloudBot
    ) {
      hits.push(
        hit(
          "ichi_breakout",
          i,
          bars,
          "bearish",
          "후행 이탈 후 장대음봉 구름 하단 이탈",
        ),
      );
    }
  }
  return hits;
}

function detectKumoSr(
  bars: OHLCVBar[],
  frames: Array<Frame | null>,
  start: number,
): IchimokuStrategyHit[] {
  const hits: IchimokuStrategyHit[] = [];
  for (let i = Math.max(start, 3); i < bars.length; i++) {
    const cur = frames[i];
    const prev = frames[i - 1];
    if (!cur || !prev || cur.tenkan == null || prev.tenkan == null) continue;
    if (cur.cloudTop == null || cur.cloudBot == null) continue;
    if (cur.bullCloud == null) continue;

    const bar = bars[i]!;
    const touchPad =
      cur.thickness != null && cur.thickness > 0
        ? cur.thickness * 0.08
        : bar.close * 0.002;

    // Bullish: green cloud support + tenkan cross up
    if (
      cur.bullCloud &&
      spanBFlat(frames, i) &&
      bar.low <= cur.cloudBot + touchPad &&
      bar.close > bar.open &&
      bars[i - 1]!.close <= prev.tenkan &&
      bar.close > cur.tenkan
    ) {
      hits.push(
        hit(
          "ichi_kumo_sr",
          i,
          bars,
          "bullish",
          "양운 지지 후 전환선 상향 돌파",
        ),
      );
    }

    // Bearish: red cloud resistance + tenkan cross down
    if (
      !cur.bullCloud &&
      spanBFlat(frames, i) &&
      bar.high >= cur.cloudTop - touchPad &&
      bar.close < bar.open &&
      bars[i - 1]!.close >= prev.tenkan &&
      bar.close < cur.tenkan
    ) {
      hits.push(
        hit(
          "ichi_kumo_sr",
          i,
          bars,
          "bearish",
          "음운 저항 후 전환선 하향 이탈",
        ),
      );
    }
  }
  return hits;
}

function capPerStrategy(hits: IchimokuStrategyHit[]): IchimokuStrategyHit[] {
  const counts = new Map<IchimokuStrategyId, number>();
  const out: IchimokuStrategyHit[] = [];
  const sorted = [...hits].sort((a, b) => b.barIndex - a.barIndex);
  for (const h of sorted) {
    const n = counts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_STRATEGY) continue;
    counts.set(h.id, n + 1);
    out.push(h);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function detectIchimokuStrategies(
  bars: OHLCVBar[],
  indicators: IndicatorResults,
  options?: { lookbackBars?: number; displacement?: number },
): IchimokuStrategyResult | null {
  const out = indicators.indicators.ichimoku;
  if (!out?.series.tenkan?.length && !out?.series.spanA?.length) return null;

  const tenkan = mapSeries(out.series.tenkan);
  const kijun = mapSeries(out.series.kijun);
  const spanA = mapSeries(out.series.spanA);
  const spanB = mapSeries(out.series.spanB);
  const displacement =
    options?.displacement ??
    (typeof out.latest.displacement === "number"
      ? out.latest.displacement
      : 26);

  const frames: Array<Frame | null> = bars.map((bar) => {
    const a = spanA.get(bar.date) ?? null;
    const b = spanB.get(bar.date) ?? null;
    let cloudTop: number | null = null;
    let cloudBot: number | null = null;
    let bullCloud: boolean | null = null;
    let thickness: number | null = null;
    if (a != null && b != null) {
      cloudTop = Math.max(a, b);
      cloudBot = Math.min(a, b);
      bullCloud = a >= b;
      thickness = cloudTop - cloudBot;
    }
    return {
      tenkan: tenkan.get(bar.date) ?? null,
      kijun: kijun.get(bar.date) ?? null,
      spanA: a,
      spanB: b,
      cloudTop,
      cloudBot,
      bullCloud,
      thickness,
    };
  });

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const start = Math.max(0, bars.length - lookback);

  const all = [
    ...detectTkCross(bars, frames, start),
    ...detectChikouCross(bars, displacement, start),
    ...detectKumoTwist(bars, frames, start),
    ...detectPriceKumoBreak(bars, frames, start),
    ...detectTrendTurn(bars, frames, displacement, start),
    ...detectBreakout(bars, frames, displacement, start),
    ...detectKumoSr(bars, frames, start),
  ];

  const inWindow = all.filter((h) => h.barIndex >= start);
  const stats = scoreSignalHits(bars, inWindow);
  const recent = capPerStrategy(inWindow);
  const lastIdx = bars.length - 1;
  const onLatestBar = recent.filter((h) => h.barIndex === lastIdx);

  return {
    lookbackBars: lookback,
    latestBarDate: bars[lastIdx]?.date ?? "",
    onLatestBar,
    recent,
    stats,
  };
}
