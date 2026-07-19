import type { OHLCVBar, TrendLabel } from "../types";
import {
  CHART_PATTERN_META,
  type ChartPatternId,
} from "../chartPatternMeta";
import {
  atrAt,
  collectSwingPivots,
  computeAtrSeries,
  fitSlope,
  linePrice,
  nearEqual,
  priceOnFit,
  type Pivot,
} from "./pivots";
import {
  scoreSignalHits,
  type SignalStatsMap,
} from "./signalFollowThrough";

export interface PatternPoint {
  barIndex: number;
  date: string;
  price: number;
  role: string;
}

export interface PatternSegment {
  x1: number;
  y1: number;
  date1: string;
  x2: number;
  y2: number;
  date2: string;
  role: "neckline" | "resistance" | "support" | "outline";
}

export interface ChartPatternInstance {
  key: string;
  id: ChartPatternId;
  direction: TrendLabel;
  status: "forming" | "confirmed";
  startBar: number;
  endBar: number;
  pivots: PatternPoint[];
  segments: PatternSegment[];
  entryBar: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  score: number;
  summary: string;
}

export interface ChartPatternHit {
  id: ChartPatternId;
  instanceKey: string;
  label: string;
  date: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
}

export interface ChartPatternResult {
  lookbackBars: number;
  leftRight: number;
  latestBarDate: string;
  instances: ChartPatternInstance[];
  onLatestBar: ChartPatternHit[];
  recent: ChartPatternHit[];
  stats: SignalStatsMap;
}

const DEFAULT_LOOKBACK = 160;
const MAX_INSTANCES = 24;
const MAX_HITS_PER_ID = 8;

function pt(p: Pivot, role: string): PatternPoint {
  return { barIndex: p.idx, date: p.date, price: p.price, role };
}

function seg(
  a: { idx: number; date: string; price: number },
  b: { idx: number; date: string; price: number },
  role: PatternSegment["role"],
): PatternSegment {
  return {
    x1: a.idx,
    y1: a.price,
    date1: a.date,
    x2: b.idx,
    y2: b.price,
    date2: b.date,
    role,
  };
}

function crossedAbove(
  bars: OHLCVBar[],
  from: number,
  to: number,
  levelAt: (i: number) => number,
): number | null {
  for (let i = Math.max(from, 1); i <= to; i++) {
    const lvl = levelAt(i);
    if (bars[i - 1].close <= lvl && bars[i].close > lvl) return i;
  }
  return null;
}

function crossedBelow(
  bars: OHLCVBar[],
  from: number,
  to: number,
  levelAt: (i: number) => number,
): number | null {
  for (let i = Math.max(from, 1); i <= to; i++) {
    const lvl = levelAt(i);
    if (bars[i - 1].close >= lvl && bars[i].close < lvl) return i;
  }
  return null;
}

function makeHit(inst: ChartPatternInstance, bars: OHLCVBar[]): ChartPatternHit | null {
  if (inst.entryBar == null || inst.status !== "confirmed") return null;
  return {
    id: inst.id,
    instanceKey: inst.key,
    label: CHART_PATTERN_META[inst.id].labelKo,
    date: bars[inst.entryBar].date,
    barIndex: inst.entryBar,
    direction: inst.direction,
    summary: inst.summary,
  };
}

function detectDoubleBottom(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const a = lows[i];
      const b = lows[j];
      if (b.idx - a.idx < 8 || b.idx - a.idx > 60) continue;
      const tol = atrAt(atr, b.idx, a.price * 0.01) * 0.55;
      if (!nearEqual(a.price, b.price, tol)) continue;
      if (b.price > a.price + tol * 0.25) continue; // second not much higher

      const midHighs = highs.filter((h) => h.idx > a.idx && h.idx < b.idx);
      if (!midHighs.length) continue;
      const neck = midHighs.reduce((best, h) =>
        h.price > best.price ? h : best,
      );
      const depth = neck.price - Math.min(a.price, b.price);
      if (depth < tol * 1.2) continue;

      const scanTo = Math.min(bars.length - 1, b.idx + 25);
      const entry = crossedAbove(bars, b.idx + 1, scanTo, () => neck.price);
      // Measured move: neckline − trough height projected above neckline.
      const target = neck.price + depth;
      const confirmed = entry != null;
      out.push({
        key: `double_bottom-${a.idx}-${b.idx}`,
        id: "double_bottom",
        direction: "bullish",
        status: confirmed ? "confirmed" : "forming",
        startBar: a.idx,
        endBar: entry ?? b.idx,
        pivots: [pt(a, "low1"), pt(neck, "neck"), pt(b, "low2")],
        segments: [
          seg(a, neck, "outline"),
          seg(neck, b, "outline"),
          seg(
            { idx: neck.idx, date: neck.date, price: neck.price },
            {
              idx: entry ?? scanTo,
              date: bars[entry ?? scanTo].date,
              price: neck.price,
            },
            "neckline",
          ),
        ],
        entryBar: entry,
        // Curriculum: stop below the second trough.
        stopPrice: b.price,
        targetPrice: target,
        score: confirmed ? 78 : 55,
        summary: confirmed
          ? `쌍바닥 목선 돌파 · 목표 ${target.toFixed(2)} · 손절 ${b.price.toFixed(2)}`
          : "쌍바닥 형성 중 (목선 대기)",
      });
    }
  }
  return out;
}

function detectDoubleTop(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const a = highs[i];
      const b = highs[j];
      if (b.idx - a.idx < 8 || b.idx - a.idx > 60) continue;
      const tol = atrAt(atr, b.idx, a.price * 0.01) * 0.55;
      if (!nearEqual(a.price, b.price, tol)) continue;
      // Second peak should not meaningfully exceed the first.
      if (b.price > a.price + tol * 0.25) continue;

      const midLows = lows.filter((l) => l.idx > a.idx && l.idx < b.idx);
      if (!midLows.length) continue;
      const neck = midLows.reduce((best, l) =>
        l.price < best.price ? l : best,
      );
      const height = Math.max(a.price, b.price) - neck.price;
      if (height < tol * 1.2) continue;

      const scanTo = Math.min(bars.length - 1, b.idx + 25);
      const entry = crossedBelow(bars, b.idx + 1, scanTo, () => neck.price);
      const target = neck.price - height;
      const confirmed = entry != null;
      out.push({
        key: `double_top-${a.idx}-${b.idx}`,
        id: "double_top",
        direction: "bearish",
        status: confirmed ? "confirmed" : "forming",
        startBar: a.idx,
        endBar: entry ?? b.idx,
        pivots: [pt(a, "high1"), pt(neck, "neck"), pt(b, "high2")],
        segments: [
          seg(a, neck, "outline"),
          seg(neck, b, "outline"),
          seg(
            { idx: neck.idx, date: neck.date, price: neck.price },
            {
              idx: entry ?? scanTo,
              date: bars[entry ?? scanTo].date,
              price: neck.price,
            },
            "neckline",
          ),
        ],
        entryBar: entry,
        stopPrice: Math.max(a.price, b.price),
        targetPrice: target,
        score: confirmed ? 78 : 55,
        summary: confirmed
          ? `쌍봉 목선 이탈 · 목표 ${target.toFixed(2)} · 손절 ${Math.max(a.price, b.price).toFixed(2)}`
          : "쌍봉 형성 중 (목선 대기)",
      });
    }
  }
  return out;
}

function detectCupAndHandle(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let i = 0; i < highs.length - 1; i++) {
    const leftRim = highs[i];
    for (let j = i + 1; j < highs.length; j++) {
      const rightRim = highs[j];
      if (rightRim.idx - leftRim.idx < 20 || rightRim.idx - leftRim.idx > 90)
        continue;
      const tol = atrAt(atr, rightRim.idx, leftRim.price * 0.01) * 0.7;
      if (!nearEqual(leftRim.price, rightRim.price, tol * 1.2)) continue;

      const cupLows = lows.filter(
        (l) => l.idx > leftRim.idx && l.idx < rightRim.idx,
      );
      if (!cupLows.length) continue;
      const cupLow = cupLows.reduce((best, l) =>
        l.price < best.price ? l : best,
      );
      const cupDepth = Math.min(leftRim.price, rightRim.price) - cupLow.price;
      if (cupDepth < tol * 2) continue;
      // U-shape: low near middle of cup
      const mid = (leftRim.idx + rightRim.idx) / 2;
      if (Math.abs(cupLow.idx - mid) > (rightRim.idx - leftRim.idx) * 0.35)
        continue;

      // Handle: shallow pullback after right rim
      const handleLows = lows.filter(
        (l) => l.idx > rightRim.idx && l.idx <= rightRim.idx + 30,
      );
      if (!handleLows.length) continue;
      const handleLow = handleLows[0];
      const handleDepth = rightRim.price - handleLow.price;
      // Curriculum: handle deeper than ~1/3 of cup raises failure odds.
      if (handleDepth <= 0 || handleDepth > cupDepth / 3) continue;

      const breakLevel = rightRim.price;
      const scanTo = Math.min(bars.length - 1, handleLow.idx + 20);
      const entry = crossedAbove(
        bars,
        handleLow.idx + 1,
        scanTo,
        () => breakLevel,
      );
      const target = breakLevel + cupDepth;
      out.push({
        key: `cup_and_handle-${leftRim.idx}-${handleLow.idx}`,
        id: "cup_and_handle",
        direction: "bullish",
        status: entry != null ? "confirmed" : "forming",
        startBar: leftRim.idx,
        endBar: entry ?? handleLow.idx,
        pivots: [
          pt(leftRim, "rimL"),
          pt(cupLow, "cup"),
          pt(rightRim, "rimR"),
          pt(handleLow, "handle"),
        ],
        segments: [
          seg(leftRim, cupLow, "outline"),
          seg(cupLow, rightRim, "outline"),
          seg(rightRim, handleLow, "support"),
          seg(
            { idx: rightRim.idx, date: rightRim.date, price: breakLevel },
            {
              idx: entry ?? scanTo,
              date: bars[entry ?? scanTo].date,
              price: breakLevel,
            },
            "resistance",
          ),
        ],
        entryBar: entry,
        stopPrice: handleLow.price,
        targetPrice: target,
        score: entry != null ? 74 : 52,
        summary:
          entry != null
            ? `컵앤핸들 돌파 · 목표 ${target.toFixed(2)}`
            : "컵앤핸들 형성 중",
      });
    }
  }
  return out;
}

function detectHeadAndShoulders(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];

  // Bearish H&S: high-low-high-low-high
  for (let i = 0; i < highs.length - 2; i++) {
    const ls = highs[i];
    const head = highs[i + 1];
    const rs = highs[i + 2];
    if (head.idx - ls.idx < 4 || rs.idx - head.idx < 4) continue;
    if (rs.idx - ls.idx > 80) continue;
    const tol = atrAt(atr, head.idx, head.price * 0.01) * 0.6;
    if (!(head.price > ls.price + tol && head.price > rs.price + tol)) continue;
    if (!nearEqual(ls.price, rs.price, tol * 1.4)) continue;

    const n1cands = lows.filter((l) => l.idx > ls.idx && l.idx < head.idx);
    const n2cands = lows.filter((l) => l.idx > head.idx && l.idx < rs.idx);
    if (!n1cands.length || !n2cands.length) continue;
    const n1 = n1cands[n1cands.length - 1];
    const n2 = n2cands[0];
    const neckSlope = (n2.price - n1.price) / Math.max(1, n2.idx - n1.idx);
    const height = head.price - Math.max(n1.price, n2.price);
    if (height < tol * 1.5) continue;

    const levelAt = (idx: number) =>
      linePrice(n1.idx, n1.price, n2.idx, n2.price, idx);
    const scanTo = Math.min(bars.length - 1, rs.idx + 25);
    const entry = crossedBelow(bars, rs.idx + 1, scanTo, levelAt);
    const entryLvl = entry != null ? levelAt(entry) : levelAt(rs.idx);
    const target = entryLvl - height;

    out.push({
      key: `hs-${ls.idx}-${head.idx}-${rs.idx}`,
      id: "head_and_shoulders",
      direction: "bearish",
      status: entry != null ? "confirmed" : "forming",
      startBar: ls.idx,
      endBar: entry ?? rs.idx,
      pivots: [
        pt(ls, "LS"),
        pt(n1, "neck1"),
        pt(head, "head"),
        pt(n2, "neck2"),
        pt(rs, "RS"),
      ],
      segments: [
        seg(ls, head, "outline"),
        seg(head, rs, "outline"),
        seg(n1, n2, "neckline"),
        seg(
          n2,
          {
            idx: entry ?? scanTo,
            date: bars[entry ?? scanTo].date,
            price: levelAt(entry ?? scanTo),
          },
          "neckline",
        ),
      ],
      entryBar: entry,
      stopPrice: Math.max(ls.price, rs.price, head.price),
      targetPrice: target,
      score: entry != null ? 80 : 58,
      summary:
        entry != null
          ? `헤드앤숄더 목선 이탈 · 목표 ${target.toFixed(2)}`
          : `헤드앤숄더 형성 중 (slope ${neckSlope.toFixed(4)})`,
    });
  }

  // Inverse H&S: low-high-low-high-low
  for (let i = 0; i < lows.length - 2; i++) {
    const ls = lows[i];
    const head = lows[i + 1];
    const rs = lows[i + 2];
    if (head.idx - ls.idx < 4 || rs.idx - head.idx < 4) continue;
    if (rs.idx - ls.idx > 80) continue;
    const tol = atrAt(atr, head.idx, head.price * 0.01) * 0.6;
    if (!(head.price < ls.price - tol && head.price < rs.price - tol)) continue;
    if (!nearEqual(ls.price, rs.price, tol * 1.4)) continue;

    const n1cands = highs.filter((h) => h.idx > ls.idx && h.idx < head.idx);
    const n2cands = highs.filter((h) => h.idx > head.idx && h.idx < rs.idx);
    if (!n1cands.length || !n2cands.length) continue;
    const n1 = n1cands[n1cands.length - 1];
    const n2 = n2cands[0];
    const height = Math.min(n1.price, n2.price) - head.price;
    if (height < tol * 1.5) continue;

    const levelAt = (idx: number) =>
      linePrice(n1.idx, n1.price, n2.idx, n2.price, idx);
    const scanTo = Math.min(bars.length - 1, rs.idx + 25);
    const entry = crossedAbove(bars, rs.idx + 1, scanTo, levelAt);
    const entryLvl = entry != null ? levelAt(entry) : levelAt(rs.idx);
    const target = entryLvl + height;

    out.push({
      key: `ihs-${ls.idx}-${head.idx}-${rs.idx}`,
      id: "head_and_shoulders",
      direction: "bullish",
      status: entry != null ? "confirmed" : "forming",
      startBar: ls.idx,
      endBar: entry ?? rs.idx,
      pivots: [
        pt(ls, "LS"),
        pt(n1, "neck1"),
        pt(head, "head"),
        pt(n2, "neck2"),
        pt(rs, "RS"),
      ],
      segments: [
        seg(ls, head, "outline"),
        seg(head, rs, "outline"),
        seg(n1, n2, "neckline"),
        seg(
          n2,
          {
            idx: entry ?? scanTo,
            date: bars[entry ?? scanTo].date,
            price: levelAt(entry ?? scanTo),
          },
          "neckline",
        ),
      ],
      entryBar: entry,
      // Curriculum: stop below the head (deepest trough).
      stopPrice: head.price,
      targetPrice: target,
      score: entry != null ? 80 : 58,
      summary:
        entry != null
          ? `역헤드앤숄더 목선 돌파 · 목표 ${target.toFixed(2)}`
          : "역헤드앤숄더 형성 중",
    });
  }

  return out;
}

function detectTripleTop(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let i = 0; i < highs.length - 2; i++) {
    const a = highs[i];
    const b = highs[i + 1];
    const c = highs[i + 2];
    if (c.idx - a.idx < 12 || c.idx - a.idx > 80) continue;
    const tol = atrAt(atr, b.idx, b.price * 0.01) * 0.55;
    if (!nearEqual(a.price, b.price, tol) || !nearEqual(b.price, c.price, tol))
      continue;
    // Head shouldn't dominate (that would be H&S)
    if (b.price > a.price + tol && b.price > c.price + tol) continue;

    const midLows = lows.filter((l) => l.idx > a.idx && l.idx < c.idx);
    if (midLows.length < 2) continue;
    const neck = midLows.reduce((best, l) => (l.price < best.price ? l : best));
    const height = Math.max(a.price, b.price, c.price) - neck.price;
    if (height < tol * 1.2) continue;

    const scanTo = Math.min(bars.length - 1, c.idx + 25);
    const entry = crossedBelow(bars, c.idx + 1, scanTo, () => neck.price);
    const target = neck.price - height;
    out.push({
      key: `triple_top-${a.idx}-${c.idx}`,
      id: "triple_top",
      direction: "bearish",
      status: entry != null ? "confirmed" : "forming",
      startBar: a.idx,
      endBar: entry ?? c.idx,
      pivots: [pt(a, "t1"), pt(b, "t2"), pt(c, "t3"), pt(neck, "neck")],
      segments: [
        seg(a, b, "resistance"),
        seg(b, c, "resistance"),
        seg(
          { idx: neck.idx, date: neck.date, price: neck.price },
          {
            idx: entry ?? scanTo,
            date: bars[entry ?? scanTo].date,
            price: neck.price,
          },
          "neckline",
        ),
      ],
      entryBar: entry,
      stopPrice: c.price,
      targetPrice: target,
      score: entry != null ? 76 : 54,
      summary:
        entry != null
          ? `3중 천장 목선 이탈 · 목표 ${target.toFixed(2)}`
          : "3중 천장 형성 중",
    });
  }
  return out;
}

function detectTripleBottom(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let i = 0; i < lows.length - 2; i++) {
    const a = lows[i];
    const b = lows[i + 1];
    const c = lows[i + 2];
    if (c.idx - a.idx < 12 || c.idx - a.idx > 80) continue;
    const tol = atrAt(atr, b.idx, b.price * 0.01) * 0.55;
    if (!nearEqual(a.price, b.price, tol) || !nearEqual(b.price, c.price, tol))
      continue;
    if (b.price < a.price - tol && b.price < c.price - tol) continue;

    const midHighs = highs.filter((h) => h.idx > a.idx && h.idx < c.idx);
    if (midHighs.length < 2) continue;
    const neck = midHighs.reduce((best, h) =>
      h.price > best.price ? h : best,
    );
    const height = neck.price - Math.min(a.price, b.price, c.price);
    if (height < tol * 1.2) continue;

    const scanTo = Math.min(bars.length - 1, c.idx + 25);
    const entry = crossedAbove(bars, c.idx + 1, scanTo, () => neck.price);
    const target = neck.price + height;
    out.push({
      key: `triple_bottom-${a.idx}-${c.idx}`,
      id: "triple_bottom",
      direction: "bullish",
      status: entry != null ? "confirmed" : "forming",
      startBar: a.idx,
      endBar: entry ?? c.idx,
      pivots: [pt(a, "b1"), pt(b, "b2"), pt(c, "b3"), pt(neck, "neck")],
      segments: [
        seg(a, b, "support"),
        seg(b, c, "support"),
        seg(
          { idx: neck.idx, date: neck.date, price: neck.price },
          {
            idx: entry ?? scanTo,
            date: bars[entry ?? scanTo].date,
            price: neck.price,
          },
          "neckline",
        ),
      ],
      entryBar: entry,
      stopPrice: c.price,
      targetPrice: target,
      score: entry != null ? 76 : 54,
      summary:
        entry != null
          ? `3중 바닥 목선 돌파 · 목표 ${target.toFixed(2)}`
          : "3중 바닥 형성 중",
    });
  }
  return out;
}

function detectWedges(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
  kind: "rising_wedge" | "falling_wedge",
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  // Sliding windows of 3+ highs and 3+ lows interleaved
  for (let end = 5; end < Math.min(highs.length, lows.length) + 3; end++) {
    const hs = highs.slice(Math.max(0, end - 4), end);
    const ls = lows.filter(
      (l) => l.idx >= (hs[0]?.idx ?? 0) && l.idx <= (hs.at(-1)?.idx ?? 0) + 5,
    );
    if (hs.length < 3 || ls.length < 3) continue;
    const winHighs = hs.slice(-3);
    const winLows = ls.slice(-3);
    const startIdx = Math.min(winHighs[0].idx, winLows[0].idx);
    const endIdx = Math.max(winHighs.at(-1)!.idx, winLows.at(-1)!.idx);
    if (endIdx - startIdx < 12 || endIdx - startIdx > 70) continue;

    const highFit = fitSlope(winHighs.map((p) => ({ idx: p.idx, price: p.price })));
    const lowFit = fitSlope(winLows.map((p) => ({ idx: p.idx, price: p.price })));
    if (!highFit || !lowFit) continue;

    const tol = atrAt(atr, endIdx, bars[endIdx].close * 0.01);
    const widthStart =
      priceOnFit(highFit, startIdx) - priceOnFit(lowFit, startIdx);
    const widthEnd = priceOnFit(highFit, endIdx) - priceOnFit(lowFit, endIdx);
    if (!(widthStart > tol && widthEnd > 0 && widthEnd < widthStart * 0.75))
      continue;

    if (kind === "rising_wedge") {
      if (!(highFit.slope > 0 && lowFit.slope > 0)) continue;
      if (!(lowFit.slope > highFit.slope)) continue; // support steeper
      const levelAt = (idx: number) => priceOnFit(lowFit, idx);
      const scanTo = Math.min(bars.length - 1, endIdx + 20);
      const entry = crossedBelow(bars, endIdx + 1, scanTo, levelAt);
      const peak = Math.max(...winHighs.map((h) => h.price));
      const target =
        (entry != null ? levelAt(entry) : levelAt(endIdx)) - widthStart;
      out.push({
        key: `rising_wedge-${startIdx}-${endIdx}`,
        id: "rising_wedge",
        direction: "bearish",
        status: entry != null ? "confirmed" : "forming",
        startBar: startIdx,
        endBar: entry ?? endIdx,
        pivots: [
          ...winHighs.map((h, n) => pt(h, `h${n + 1}`)),
          ...winLows.map((l, n) => pt(l, `l${n + 1}`)),
        ],
        segments: [
          seg(winHighs[0], winHighs.at(-1)!, "resistance"),
          seg(winLows[0], winLows.at(-1)!, "support"),
        ],
        entryBar: entry,
        stopPrice: peak,
        targetPrice: target,
        score: entry != null ? 72 : 50,
        summary:
          entry != null
            ? `상승 쐐기 지지 이탈 · 목표 ${target.toFixed(2)}`
            : "상승 쐐기 형성 중",
      });
    } else {
      if (!(highFit.slope < 0 && lowFit.slope < 0)) continue;
      if (!(Math.abs(highFit.slope) > Math.abs(lowFit.slope))) continue;
      const levelAt = (idx: number) => priceOnFit(highFit, idx);
      const scanTo = Math.min(bars.length - 1, endIdx + 20);
      const entry = crossedAbove(bars, endIdx + 1, scanTo, levelAt);
      const trough = Math.min(...winLows.map((l) => l.price));
      const target =
        (entry != null ? levelAt(entry) : levelAt(endIdx)) + widthStart;
      out.push({
        key: `falling_wedge-${startIdx}-${endIdx}`,
        id: "falling_wedge",
        direction: "bullish",
        status: entry != null ? "confirmed" : "forming",
        startBar: startIdx,
        endBar: entry ?? endIdx,
        pivots: [
          ...winHighs.map((h, n) => pt(h, `h${n + 1}`)),
          ...winLows.map((l, n) => pt(l, `l${n + 1}`)),
        ],
        segments: [
          seg(winHighs[0], winHighs.at(-1)!, "resistance"),
          seg(winLows[0], winLows.at(-1)!, "support"),
        ],
        entryBar: entry,
        stopPrice: trough,
        targetPrice: target,
        score: entry != null ? 72 : 50,
        summary:
          entry != null
            ? `하강 쐐기 저항 돌파 · 목표 ${target.toFixed(2)}`
            : "하강 쐐기 형성 중",
      });
    }
  }
  return out;
}

function detectTriangles(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
  kind: "ascending_triangle" | "descending_triangle",
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  for (let end = 3; end <= highs.length; end++) {
    const winHighs = highs.slice(Math.max(0, end - 4), end);
    if (winHighs.length < 3) continue;
    const start = winHighs[0].idx;
    const last = winHighs.at(-1)!.idx;
    const winLows = lows.filter((l) => l.idx >= start && l.idx <= last + 3);
    if (winLows.length < 2) continue;
    const tol = atrAt(atr, last, bars[last].close * 0.01) * 0.55;
    const highFit = fitSlope(
      winHighs.map((p) => ({ idx: p.idx, price: p.price })),
    );
    const lowFit = fitSlope(
      winLows.slice(-3).map((p) => ({ idx: p.idx, price: p.price })),
    );
    if (!highFit || !lowFit) continue;
    if (last - start < 10 || last - start > 70) continue;

    const flatHigh =
      Math.abs(highFit.slope) * (last - start) <= tol * 0.9 &&
      nearEqual(winHighs[0].price, winHighs.at(-1)!.price, tol * 1.1);
    const flatLow =
      Math.abs(lowFit.slope) * (last - start) <= tol * 0.9 &&
      nearEqual(winLows[0].price, winLows.at(-1)!.price, tol * 1.1);

    if (kind === "ascending_triangle") {
      if (!flatHigh || !(lowFit.slope > 0)) continue;
      const resistance = winHighs.reduce((s, h) => s + h.price, 0) / winHighs.length;
      const height = resistance - winLows[0].price;
      if (height < tol * 1.2) continue;
      const scanTo = Math.min(bars.length - 1, last + 20);
      const entry = crossedAbove(bars, last + 1, scanTo, () => resistance);
      const target = resistance + height;
      out.push({
        key: `asc_tri-${start}-${last}`,
        id: "ascending_triangle",
        direction: "bullish",
        status: entry != null ? "confirmed" : "forming",
        startBar: start,
        endBar: entry ?? last,
        pivots: [
          ...winHighs.map((h, n) => pt(h, `h${n + 1}`)),
          ...winLows.slice(-3).map((l, n) => pt(l, `l${n + 1}`)),
        ],
        segments: [
          seg(
            { idx: start, date: bars[start].date, price: resistance },
            { idx: entry ?? scanTo, date: bars[entry ?? scanTo].date, price: resistance },
            "resistance",
          ),
          seg(winLows.slice(-3)[0], winLows.at(-1)!, "support"),
        ],
        entryBar: entry,
        stopPrice: winLows.at(-1)!.price,
        targetPrice: target,
        score: entry != null ? 75 : 53,
        summary:
          entry != null
            ? `상승 삼각형 돌파 · 목표 ${target.toFixed(2)}`
            : "상승 삼각형 형성 중",
      });
    } else {
      if (!flatLow || !(highFit.slope < 0)) continue;
      const support = winLows.reduce((s, l) => s + l.price, 0) / winLows.length;
      const height = winHighs[0].price - support;
      if (height < tol * 1.2) continue;
      const scanTo = Math.min(bars.length - 1, last + 20);
      const entry = crossedBelow(bars, last + 1, scanTo, () => support);
      const target = support - height;
      out.push({
        key: `desc_tri-${start}-${last}`,
        id: "descending_triangle",
        direction: "bearish",
        status: entry != null ? "confirmed" : "forming",
        startBar: start,
        endBar: entry ?? last,
        pivots: [
          ...winHighs.map((h, n) => pt(h, `h${n + 1}`)),
          ...winLows.slice(-3).map((l, n) => pt(l, `l${n + 1}`)),
        ],
        segments: [
          seg(winHighs[0], winHighs.at(-1)!, "resistance"),
          seg(
            { idx: start, date: bars[start].date, price: support },
            { idx: entry ?? scanTo, date: bars[entry ?? scanTo].date, price: support },
            "support",
          ),
        ],
        entryBar: entry,
        stopPrice: winHighs.at(-1)!.price,
        targetPrice: target,
        score: entry != null ? 75 : 53,
        summary:
          entry != null
            ? `하락 삼각형 이탈 · 목표 ${target.toFixed(2)}`
            : "하락 삼각형 형성 중",
      });
    }
  }
  return out;
}

function detectPennant(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  // Anchor poles at swing extremes to keep search tractable.
  const anchors = [...highs, ...lows]
    .map((p) => p.idx)
    .filter((idx, n, arr) => arr.indexOf(idx) === n)
    .sort((a, b) => a - b);

  for (const i of anchors) {
    if (i < 8 || i >= bars.length - 10) continue;
    const atrI = atrAt(atr, i, bars[i].close * 0.01);
    for (const len of [5, 8, 12]) {
      const start = i - len;
      if (start < 1) continue;
      const move = bars[i].close - bars[start].close;
      const poleBull = move > atrI * 2.2;
      const poleBear = move < -atrI * 2.2;
      if (!poleBull && !poleBear) continue;

      const hs = highs.filter((h) => h.idx > i && h.idx <= i + 25).slice(0, 3);
      const ls = lows.filter((l) => l.idx > i && l.idx <= i + 25).slice(0, 3);
      if (hs.length < 2 || ls.length < 2) continue;
      const highFit = fitSlope(hs.map((p) => ({ idx: p.idx, price: p.price })));
      const lowFit = fitSlope(ls.map((p) => ({ idx: p.idx, price: p.price })));
      if (!highFit || !lowFit) continue;
      if (!(highFit.slope < 0 && lowFit.slope > 0)) continue;

      const endIdx = Math.max(hs.at(-1)!.idx, ls.at(-1)!.idx);
      const w0 =
        priceOnFit(highFit, hs[0].idx) - priceOnFit(lowFit, ls[0].idx);
      const w1 = priceOnFit(highFit, endIdx) - priceOnFit(lowFit, endIdx);
      if (!(w0 > atrI * 0.6 && w1 < w0 * 0.7)) continue;

      const poleH = Math.abs(move);
      const scanTo = Math.min(bars.length - 1, endIdx + 15);
      if (poleBull) {
        const levelAt = (idx: number) => priceOnFit(highFit, idx);
        const entry = crossedAbove(bars, endIdx + 1, scanTo, levelAt);
        const target =
          (entry != null ? bars[entry].close : bars[endIdx].close) + poleH;
        out.push({
          key: `pennant-bull-${start}-${endIdx}`,
          id: "pennant",
          direction: "bullish",
          status: entry != null ? "confirmed" : "forming",
          startBar: start,
          endBar: entry ?? endIdx,
          pivots: [
            {
              barIndex: start,
              date: bars[start].date,
              price: bars[start].close,
              role: "pole",
            },
            ...hs.map((h, n) => pt(h, `h${n + 1}`)),
            ...ls.map((l, n) => pt(l, `l${n + 1}`)),
          ],
          segments: [
            seg(
              { idx: start, date: bars[start].date, price: bars[start].close },
              { idx: i, date: bars[i].date, price: bars[i].close },
              "outline",
            ),
            seg(hs[0], hs.at(-1)!, "resistance"),
            seg(ls[0], ls.at(-1)!, "support"),
          ],
          entryBar: entry,
          stopPrice: ls.at(-1)!.price,
          targetPrice: target,
          score: entry != null ? 70 : 48,
          summary:
            entry != null
              ? `상승 페넌트 돌파 · 목표 ${target.toFixed(2)}`
              : "상승 페넌트 형성 중",
        });
      } else {
        const levelAt = (idx: number) => priceOnFit(lowFit, idx);
        const entry = crossedBelow(bars, endIdx + 1, scanTo, levelAt);
        const target =
          (entry != null ? bars[entry].close : bars[endIdx].close) - poleH;
        out.push({
          key: `pennant-bear-${start}-${endIdx}`,
          id: "pennant",
          direction: "bearish",
          status: entry != null ? "confirmed" : "forming",
          startBar: start,
          endBar: entry ?? endIdx,
          pivots: [
            {
              barIndex: start,
              date: bars[start].date,
              price: bars[start].close,
              role: "pole",
            },
            ...hs.map((h, n) => pt(h, `h${n + 1}`)),
            ...ls.map((l, n) => pt(l, `l${n + 1}`)),
          ],
          segments: [
            seg(
              { idx: start, date: bars[start].date, price: bars[start].close },
              { idx: i, date: bars[i].date, price: bars[i].close },
              "outline",
            ),
            seg(hs[0], hs.at(-1)!, "resistance"),
            seg(ls[0], ls.at(-1)!, "support"),
          ],
          entryBar: entry,
          stopPrice: hs.at(-1)!.price,
          targetPrice: target,
          score: entry != null ? 70 : 48,
          summary:
            entry != null
              ? `하락 페넌트 이탈 · 목표 ${target.toFixed(2)}`
              : "하락 페넌트 형성 중",
        });
      }
    }
  }
  return out;
}

/** Parallel-channel continuation after a pole (distinct from converging pennant). */
function detectFlag(
  bars: OHLCVBar[],
  lows: Pivot[],
  highs: Pivot[],
  atr: Array<number | null>,
): ChartPatternInstance[] {
  const out: ChartPatternInstance[] = [];
  const anchors = [...highs, ...lows]
    .map((p) => p.idx)
    .filter((idx, n, arr) => arr.indexOf(idx) === n)
    .sort((a, b) => a - b);

  for (const i of anchors) {
    if (i < 8 || i >= bars.length - 10) continue;
    const atrI = atrAt(atr, i, bars[i].close * 0.01);
    for (const len of [5, 8, 12]) {
      const start = i - len;
      if (start < 1) continue;
      const move = bars[i].close - bars[start].close;
      const poleBull = move > atrI * 2.2;
      const poleBear = move < -atrI * 2.2;
      if (!poleBull && !poleBear) continue;

      const hs = highs.filter((h) => h.idx > i && h.idx <= i + 22).slice(0, 3);
      const ls = lows.filter((l) => l.idx > i && l.idx <= i + 22).slice(0, 3);
      if (hs.length < 2 || ls.length < 2) continue;
      const highFit = fitSlope(hs.map((p) => ({ idx: p.idx, price: p.price })));
      const lowFit = fitSlope(ls.map((p) => ({ idx: p.idx, price: p.price })));
      if (!highFit || !lowFit) continue;

      // Parallel channel (not converging triangle).
      const slopeDiff = Math.abs(highFit.slope - lowFit.slope);
      if (slopeDiff > atrI * 0.08) continue;

      const endIdx = Math.max(hs.at(-1)!.idx, ls.at(-1)!.idx);
      const w0 =
        priceOnFit(highFit, hs[0].idx) - priceOnFit(lowFit, ls[0].idx);
      const w1 = priceOnFit(highFit, endIdx) - priceOnFit(lowFit, endIdx);
      if (!(w0 > atrI * 0.5 && w1 > w0 * 0.55 && w1 < w0 * 1.35)) continue;

      const poleH = Math.abs(move);
      // Flag depth typically within ~1/2 of pole.
      if (w0 > poleH * 0.55) continue;

      const scanTo = Math.min(bars.length - 1, endIdx + 15);
      if (poleBull) {
        // Bull flag: mild downward/flat channel after rally.
        if (!(highFit.slope <= atrI * 0.02 && lowFit.slope <= atrI * 0.02))
          continue;
        const levelAt = (idx: number) => priceOnFit(highFit, idx);
        const entry = crossedAbove(bars, endIdx + 1, scanTo, levelAt);
        const target =
          (entry != null ? bars[entry].close : bars[endIdx].close) + poleH;
        out.push({
          key: `flag-bull-${start}-${endIdx}`,
          id: "flag",
          direction: "bullish",
          status: entry != null ? "confirmed" : "forming",
          startBar: start,
          endBar: entry ?? endIdx,
          pivots: [
            {
              barIndex: start,
              date: bars[start].date,
              price: bars[start].close,
              role: "pole",
            },
            ...hs.map((h, n) => pt(h, `h${n + 1}`)),
            ...ls.map((l, n) => pt(l, `l${n + 1}`)),
          ],
          segments: [
            seg(
              { idx: start, date: bars[start].date, price: bars[start].close },
              { idx: i, date: bars[i].date, price: bars[i].close },
              "outline",
            ),
            seg(hs[0], hs.at(-1)!, "resistance"),
            seg(ls[0], ls.at(-1)!, "support"),
          ],
          entryBar: entry,
          stopPrice: ls.at(-1)!.price,
          targetPrice: target,
          score: entry != null ? 72 : 50,
          summary:
            entry != null
              ? `상승 깃발 돌파 · 목표 ${target.toFixed(2)}`
              : "상승 깃발 형성 중",
        });
      } else {
        // Bear flag: mild upward/flat channel after selloff.
        if (!(highFit.slope >= -atrI * 0.02 && lowFit.slope >= -atrI * 0.02))
          continue;
        const levelAt = (idx: number) => priceOnFit(lowFit, idx);
        const entry = crossedBelow(bars, endIdx + 1, scanTo, levelAt);
        const target =
          (entry != null ? bars[entry].close : bars[endIdx].close) - poleH;
        out.push({
          key: `flag-bear-${start}-${endIdx}`,
          id: "flag",
          direction: "bearish",
          status: entry != null ? "confirmed" : "forming",
          startBar: start,
          endBar: entry ?? endIdx,
          pivots: [
            {
              barIndex: start,
              date: bars[start].date,
              price: bars[start].close,
              role: "pole",
            },
            ...hs.map((h, n) => pt(h, `h${n + 1}`)),
            ...ls.map((l, n) => pt(l, `l${n + 1}`)),
          ],
          segments: [
            seg(
              { idx: start, date: bars[start].date, price: bars[start].close },
              { idx: i, date: bars[i].date, price: bars[i].close },
              "outline",
            ),
            seg(hs[0], hs.at(-1)!, "resistance"),
            seg(ls[0], ls.at(-1)!, "support"),
          ],
          entryBar: entry,
          stopPrice: hs.at(-1)!.price,
          targetPrice: target,
          score: entry != null ? 72 : 50,
          summary:
            entry != null
              ? `하락 깃발 이탈 · 목표 ${target.toFixed(2)}`
              : "하락 깃발 형성 중",
        });
      }
    }
  }
  return out;
}

function dedupeInstances(instances: ChartPatternInstance[]): ChartPatternInstance[] {
  const byId = new Map<ChartPatternId, ChartPatternInstance[]>();
  const sorted = [...instances].sort((a, b) => b.score - a.score || b.endBar - a.endBar);
  const out: ChartPatternInstance[] = [];
  for (const inst of sorted) {
    const list = byId.get(inst.id) ?? [];
    const overlaps = list.some(
      (o) =>
        !(inst.endBar < o.startBar || inst.startBar > o.endBar) &&
        Math.abs(inst.startBar - o.startBar) < 8,
    );
    if (overlaps) continue;
    list.push(inst);
    byId.set(inst.id, list);
    out.push(inst);
    if (out.length >= MAX_INSTANCES) break;
  }
  return out.sort((a, b) => a.startBar - b.startBar);
}

export function detectChartPatterns(
  bars: OHLCVBar[],
  options?: { lookbackBars?: number; leftRight?: number },
): ChartPatternResult | null {
  if (bars.length < 40) return null;

  const lookback = options?.lookbackBars ?? DEFAULT_LOOKBACK;
  const leftRight = options?.leftRight ?? 3;
  const start = Math.max(0, bars.length - lookback);
  const window = bars.slice(start);
  const offset = start;

  const pivots = collectSwingPivots(window, leftRight).map((p) => ({
    ...p,
    idx: p.idx + offset,
  }));
  const highs = pivots.filter((p) => p.kind === "high");
  const lows = pivots.filter((p) => p.kind === "low");
  const atr = computeAtrSeries(bars, 14);

  const raw = [
    ...detectDoubleBottom(bars, lows, highs, atr),
    ...detectDoubleTop(bars, lows, highs, atr),
    ...detectCupAndHandle(bars, lows, highs, atr),
    ...detectHeadAndShoulders(bars, lows, highs, atr),
    ...detectTripleTop(bars, lows, highs, atr),
    ...detectTripleBottom(bars, lows, highs, atr),
    ...detectWedges(bars, lows, highs, atr, "rising_wedge"),
    ...detectWedges(bars, lows, highs, atr, "falling_wedge"),
    ...detectTriangles(bars, lows, highs, atr, "ascending_triangle"),
    ...detectTriangles(bars, lows, highs, atr, "descending_triangle"),
    ...detectPennant(bars, lows, highs, atr),
    ...detectFlag(bars, lows, highs, atr),
  ].filter((inst) => inst.endBar >= start);

  const instances = dedupeInstances(raw);
  const stats = scoreSignalHits(
    bars,
    instances
      .filter(
        (inst) =>
          inst.status === "confirmed" &&
          inst.entryBar != null &&
          inst.entryBar >= start &&
          (inst.direction === "bullish" || inst.direction === "bearish"),
      )
      .map((inst) => ({
        id: inst.id,
        barIndex: inst.entryBar!,
        direction: inst.direction,
        targetPrice: inst.targetPrice,
        stopPrice: inst.stopPrice,
        horizon: 24,
      })),
  );
  const hits: ChartPatternHit[] = [];
  const hitCounts = new Map<ChartPatternId, number>();
  for (const inst of [...instances].sort(
    (a, b) => (b.entryBar ?? 0) - (a.entryBar ?? 0),
  )) {
    const h = makeHit(inst, bars);
    if (!h || h.barIndex < start) continue;
    const n = hitCounts.get(h.id) ?? 0;
    if (n >= MAX_HITS_PER_ID) continue;
    hitCounts.set(h.id, n + 1);
    hits.push(h);
  }
  hits.sort((a, b) => a.barIndex - b.barIndex);

  const lastIdx = bars.length - 1;
  return {
    lookbackBars: lookback,
    leftRight,
    latestBarDate: bars[lastIdx]?.date ?? "",
    instances,
    onLatestBar: hits.filter((h) => h.barIndex === lastIdx),
    recent: hits,
    stats,
  };
}
