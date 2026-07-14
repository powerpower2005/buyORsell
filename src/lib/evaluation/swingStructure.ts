import type { OHLCVBar, TrendLabel } from "../types";
import { requireNonEmptyArray } from "../require";

export type SwingKind = "high" | "low";
export type SwingLabel = "HH" | "HL" | "LH" | "LL";
export type StructureRegime = "bullish" | "bearish" | "neutral";

export interface SwingPoint {
  date: string;
  barIndex: number;
  price: number;
  kind: SwingKind;
  /** Absent for the first high/low of each kind (no prior swing to compare). */
  label?: SwingLabel;
}

export interface StructureTransition {
  date: string;
  barIndex: number;
  from: StructureRegime;
  to: StructureRegime;
  triggerLabel: SwingLabel;
  triggerKind: SwingKind;
}

export interface StructureCurrent {
  regime: StructureRegime;
  lastHighLabel: SwingLabel | null;
  lastLowLabel: SwingLabel | null;
  summary: string;
}

export interface SwingStructureResult {
  leftRight: number;
  swings: SwingPoint[];
  transitions: StructureTransition[];
  current: StructureCurrent;
}

export interface DetectSwingOptions {
  leftRight?: number;
}

function isSwingHigh(bars: OHLCVBar[], idx: number, n: number): boolean {
  const h = bars[idx].high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].high >= h) return false;
  }
  return true;
}

function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  const l = bars[idx].low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx) continue;
    if (bars[i].low <= l) return false;
  }
  return true;
}

function regimeFromLabels(
  highLabel: SwingLabel | null,
  lowLabel: SwingLabel | null,
): StructureRegime {
  if (highLabel === "HH" && lowLabel === "HL") return "bullish";
  if (highLabel === "LH" && lowLabel === "LL") return "bearish";
  return "neutral";
}

function summaryFor(current: Omit<StructureCurrent, "summary">): string {
  if (current.regime === "bullish") return "HH+HL 연속 (상승 구조)";
  if (current.regime === "bearish") return "LL+LH 연속 (하락 구조)";
  const h = current.lastHighLabel ?? "—";
  const l = current.lastLowLabel ?? "—";
  return `혼합/중립 (${h}, ${l})`;
}

/**
 * Fractal pivots → HH/HL/LH/LL labels → bullish/bearish regime continuity + flips.
 */
export function detectSwingStructure(
  bars: OHLCVBar[],
  options?: DetectSwingOptions,
): SwingStructureResult {
  requireNonEmptyArray(bars, "OHLCV bars for swing structure");
  const n = options?.leftRight ?? 3;
  const minLen = n * 2 + 1;
  if (bars.length < minLen) {
    return {
      leftRight: n,
      swings: [],
      transitions: [],
      current: {
        regime: "neutral",
        lastHighLabel: null,
        lastLowLabel: null,
        summary: "데이터 부족",
      },
    };
  }

  type RawPivot = { idx: number; kind: SwingKind; price: number };
  const pivots: RawPivot[] = [];

  for (let i = n; i < bars.length - n; i++) {
    const high = isSwingHigh(bars, i, n);
    const low = isSwingLow(bars, i, n);
    // Prefer the extreme that matches direction if both (rare); keep both as separate if needed
    if (high) pivots.push({ idx: i, kind: "high", price: bars[i].high });
    if (low) pivots.push({ idx: i, kind: "low", price: bars[i].low });
  }

  pivots.sort((a, b) => a.idx - b.idx || (a.kind === "high" ? -1 : 1));

  const swings: SwingPoint[] = [];
  let lastHighPrice: number | null = null;
  let lastLowPrice: number | null = null;
  let lastHighLabel: SwingLabel | null = null;
  let lastLowLabel: SwingLabel | null = null;
  let regime: StructureRegime = "neutral";
  /** Last bullish/bearish structure; surviving brief neutral so flips are detectable. */
  let lastFirmRegime: "bullish" | "bearish" | null = null;
  const transitions: StructureTransition[] = [];

  for (const p of pivots) {
    let label: SwingLabel | undefined;

    if (p.kind === "high") {
      if (lastHighPrice != null) {
        label = p.price > lastHighPrice ? "HH" : "LH";
        lastHighLabel = label;
      }
      lastHighPrice = p.price;
    } else {
      if (lastLowPrice != null) {
        label = p.price > lastLowPrice ? "HL" : "LL";
        lastLowLabel = label;
      }
      lastLowPrice = p.price;
    }

    swings.push({
      date: bars[p.idx].date,
      barIndex: p.idx,
      price: p.price,
      kind: p.kind,
      label,
    });

    if (label == null) continue;

    const next = regimeFromLabels(lastHighLabel, lastLowLabel);
    // One pivot updates one side, so firm→firm flips usually pass through
    // neutral; compare against lastFirmRegime rather than current regime.
    if (
      (next === "bullish" || next === "bearish") &&
      lastFirmRegime != null &&
      next !== lastFirmRegime
    ) {
      transitions.push({
        date: bars[p.idx].date,
        barIndex: p.idx,
        from: lastFirmRegime,
        to: next,
        triggerLabel: label,
        triggerKind: p.kind,
      });
    }
    if (next === "bullish" || next === "bearish") {
      lastFirmRegime = next;
    }
    regime = next;
  }

  const currentBase = {
    regime,
    lastHighLabel,
    lastLowLabel,
  };

  return {
    leftRight: n,
    swings,
    transitions,
    current: {
      ...currentBase,
      summary: summaryFor(currentBase),
    },
  };
}

export function structureRegimeLabel(regime: StructureRegime): string {
  if (regime === "bullish") return "상승 (HH+HL)";
  if (regime === "bearish") return "하락 (LL+LH)";
  return "중립/혼합";
}

export function swingLabelDirection(label: SwingLabel): TrendLabel {
  if (label === "HH" || label === "HL") return "bullish";
  return "bearish";
}
