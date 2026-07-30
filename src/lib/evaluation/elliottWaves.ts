import type { OHLCVBar, TrendLabel } from "../types";
import type { SwingStructureResult } from "./swingStructure";

export type ElliottWaveLabel =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "A"
  | "B"
  | "C";

export interface ElliottPivot {
  barIndex: number;
  date: string;
  price: number;
  kind: "high" | "low";
  /** null = zigzag vertex only (usually wave start). */
  label: ElliottWaveLabel | null;
}

export interface ElliottWavePattern {
  id: string;
  /** impulse = 1–5, corrective = A–C */
  kind: "impulse" | "corrective";
  direction: TrendLabel;
  pivots: ElliottPivot[];
  /** 0–100 quality from rules + fib fit */
  score: number;
  summary: string;
  /** Absolute rules all passed */
  rulesOk: boolean;
  notes: string[];
}

export interface ElliottWaveResult {
  patterns: ElliottWavePattern[];
  /** Best impulse + best corrective for overlay (may be empty). */
  primary: ElliottWavePattern[];
}

const PIVOT_N = 3;
const MAX_PATTERNS = 6;

function isSwingHigh(bars: OHLCVBar[], idx: number, n: number): boolean {
  const h = bars[idx]!.high;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx || i < 0 || i >= bars.length) continue;
    if (bars[i]!.high >= h) return false;
  }
  return true;
}

function isSwingLow(bars: OHLCVBar[], idx: number, n: number): boolean {
  const l = bars[idx]!.low;
  for (let i = idx - n; i <= idx + n; i++) {
    if (i === idx || i < 0 || i >= bars.length) continue;
    if (bars[i]!.low <= l) return false;
  }
  return true;
}

interface RawPivot {
  barIndex: number;
  date: string;
  price: number;
  kind: "high" | "low";
}

function pivotsFromStructure(structure: SwingStructureResult): RawPivot[] {
  return structure.swings.map((s) => ({
    barIndex: s.barIndex,
    date: s.date,
    price: s.price,
    kind: s.kind,
  }));
}

function pivotsFromBars(bars: OHLCVBar[]): RawPivot[] {
  const out: RawPivot[] = [];
  for (let i = PIVOT_N; i < bars.length - PIVOT_N; i++) {
    if (isSwingHigh(bars, i, PIVOT_N)) {
      out.push({
        barIndex: i,
        date: bars[i]!.date,
        price: bars[i]!.high,
        kind: "high",
      });
    }
    if (isSwingLow(bars, i, PIVOT_N)) {
      out.push({
        barIndex: i,
        date: bars[i]!.date,
        price: bars[i]!.low,
        kind: "low",
      });
    }
  }
  out.sort((a, b) => a.barIndex - b.barIndex);
  return out;
}

/** Collapse to strict alternating high/low (keep extremes if same kind consecutive). */
function alternate(pivots: RawPivot[]): RawPivot[] {
  if (!pivots.length) return [];
  const out: RawPivot[] = [pivots[0]!];
  for (let i = 1; i < pivots.length; i++) {
    const p = pivots[i]!;
    const last = out[out.length - 1]!;
    if (p.kind !== last.kind) {
      out.push(p);
      continue;
    }
    if (p.kind === "high" && p.price >= last.price) out[out.length - 1] = p;
    if (p.kind === "low" && p.price <= last.price) out[out.length - 1] = p;
  }
  return out;
}

function fibRatio(part: number, whole: number): number | null {
  if (!(whole > 0)) return null;
  return part / whole;
}

function near(ratio: number | null, target: number, tol = 0.12): boolean {
  if (ratio == null) return false;
  return Math.abs(ratio - target) <= tol;
}

function scoreFibBullImpulse(
  L0: number,
  H1: number,
  L2: number,
  H3: number,
  L4: number,
  H5: number,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 40;
  const w1 = H1 - L0;
  const w2 = H1 - L2;
  const w3 = H3 - L2;
  const w4 = H3 - L4;
  const w5 = H5 - L4;
  const r2 = fibRatio(w2, w1);
  const r3 = fibRatio(w3, w1);
  const r4 = fibRatio(w4, w3);
  const r5 = fibRatio(w5, w1);

  if (r2 != null && r2 >= 0.318 && r2 <= 0.786) {
    score += 12;
    notes.push(`2파 되돌림 ${(r2 * 100).toFixed(0)}%`);
  }
  if (near(r3, 1.618, 0.35) || (r3 != null && r3 >= 1.0)) {
    score += 15;
    notes.push(`3파/1파 ${(r3 ?? 0).toFixed(2)}`);
  }
  if (r4 != null && r4 >= 0.2 && r4 <= 0.5) {
    score += 10;
    notes.push(`4파 되돌림 ${(r4 * 100).toFixed(0)}%`);
  }
  if (near(r5, 1.0, 0.25) || near(r5, 0.618, 0.15)) {
    score += 8;
    notes.push(`5파/1파 ${(r5 ?? 0).toFixed(2)}`);
  }
  if (w3 >= w1 && w3 >= w5) {
    score += 10;
    notes.push("3파가 가장 김");
  }
  return { score: Math.min(100, score), notes };
}

function tryBullImpulse(
  seq: RawPivot[],
  i0: number,
): ElliottWavePattern | null {
  // Need L H L H L H starting at low
  if (i0 + 5 >= seq.length) return null;
  const p = seq.slice(i0, i0 + 6);
  if (
    p[0]!.kind !== "low" ||
    p[1]!.kind !== "high" ||
    p[2]!.kind !== "low" ||
    p[3]!.kind !== "high" ||
    p[4]!.kind !== "low" ||
    p[5]!.kind !== "high"
  ) {
    return null;
  }
  const [L0, H1, L2, H3, L4, H5] = p;
  const notes: string[] = [];
  let rulesOk = true;

  // Rule 1: wave 2 low > wave 1 start
  if (L2!.price <= L0!.price) {
    rulesOk = false;
    notes.push("규칙위반: 2파가 1파 시작 아래");
  }
  // Rule 3: wave 4 low > wave 1 high (no overlap)
  if (L4!.price <= H1!.price) {
    rulesOk = false;
    notes.push("규칙위반: 4파가 1파와 겹침");
  }
  // Wave 3 must exceed wave 1 high
  if (H3!.price <= H1!.price) {
    rulesOk = false;
    notes.push("규칙위반: 3파 고점 미갱신");
  }

  const w1 = H1!.price - L0!.price;
  const w3 = H3!.price - L2!.price;
  const w5 = H5!.price - L4!.price;
  if (!(w1 > 0 && w3 > 0 && w5 > 0)) return null;

  // Rule 2: wave 3 not shortest
  if (w3 < w1 && w3 < w5) {
    rulesOk = false;
    notes.push("규칙위반: 3파가 최단");
  }

  if (!rulesOk) return null;

  const fib = scoreFibBullImpulse(
    L0!.price,
    H1!.price,
    L2!.price,
    H3!.price,
    L4!.price,
    H5!.price,
  );

  // Zigzag vertices; label on wave ends (start has empty label for line only).
  const overlayPivots: ElliottPivot[] = [
    { ...L0!, label: null },
    { ...H1!, label: "1" },
    { ...L2!, label: "2" },
    { ...H3!, label: "3" },
    { ...L4!, label: "4" },
    { ...H5!, label: "5" },
  ];

  return {
    id: `imp-bull-${L0!.barIndex}-${H5!.barIndex}`,
    kind: "impulse",
    direction: "bullish",
    pivots: overlayPivots,
    score: fib.score,
    summary: `상승 추진 1–5 · 점수 ${fib.score}`,
    rulesOk: true,
    notes: fib.notes,
  };
}

function tryBearImpulse(
  seq: RawPivot[],
  i0: number,
): ElliottWavePattern | null {
  // H L H L H L starting at high
  if (i0 + 5 >= seq.length) return null;
  const p = seq.slice(i0, i0 + 6);
  if (
    p[0]!.kind !== "high" ||
    p[1]!.kind !== "low" ||
    p[2]!.kind !== "high" ||
    p[3]!.kind !== "low" ||
    p[4]!.kind !== "high" ||
    p[5]!.kind !== "low"
  ) {
    return null;
  }
  const [H0, L1, H2, L3, H4, L5] = p;
  const notes: string[] = [];

  if (H2!.price >= H0!.price) {
    notes.push("규칙위반: 2파가 1파 시작 위");
    return null;
  }
  if (H4!.price >= L1!.price) {
    notes.push("규칙위반: 4파가 1파와 겹침");
    return null;
  }
  if (L3!.price >= L1!.price) {
    notes.push("규칙위반: 3파 저점 미갱신");
    return null;
  }

  const w1 = H0!.price - L1!.price;
  const w3 = H2!.price - L3!.price;
  const w5 = H4!.price - L5!.price;
  if (!(w1 > 0 && w3 > 0 && w5 > 0)) return null;
  if (w3 < w1 && w3 < w5) {
    notes.push("규칙위반: 3파가 최단");
    return null;
  }

  // Fib mirror
  const r2 = fibRatio(H2!.price - L1!.price, w1);
  const r3 = fibRatio(w3, w1);
  let score = 40;
  const fibNotes: string[] = [];
  if (r2 != null && r2 >= 0.318 && r2 <= 0.786) {
    score += 12;
    fibNotes.push(`2파 되돌림 ${(r2 * 100).toFixed(0)}%`);
  }
  if (r3 != null && r3 >= 1.0) {
    score += 15;
    fibNotes.push(`3파/1파 ${r3.toFixed(2)}`);
  }
  if (w3 >= w1 && w3 >= w5) {
    score += 10;
    fibNotes.push("3파가 가장 김");
  }

  return {
    id: `imp-bear-${H0!.barIndex}-${L5!.barIndex}`,
    kind: "impulse",
    direction: "bearish",
    pivots: [
      { ...H0!, label: null },
      { ...L1!, label: "1" },
      { ...H2!, label: "2" },
      { ...L3!, label: "3" },
      { ...H4!, label: "4" },
      { ...L5!, label: "5" },
    ],
    score: Math.min(100, score),
    summary: `하락 추진 1–5 · 점수 ${Math.min(100, score)}`,
    rulesOk: true,
    notes: fibNotes,
  };
}

function tryBullCorrective(
  seq: RawPivot[],
  i0: number,
): ElliottWavePattern | null {
  // After down impulse sense: L H L starting... for ABC up correction: L A(=H) B(=L) C(=H)
  // Standard ABC down after up: H L H L — A=L, B=H, C=L
  if (i0 + 3 >= seq.length) return null;
  const p = seq.slice(i0, i0 + 4);
  if (
    p[0]!.kind !== "high" ||
    p[1]!.kind !== "low" ||
    p[2]!.kind !== "high" ||
    p[3]!.kind !== "low"
  ) {
    return null;
  }
  const [H0, La, Hb, Lc] = p;
  if (La!.price >= H0!.price) return null;
  if (Hb!.price <= La!.price) return null;
  if (Lc!.price >= La!.price) return null; // C typically makes new low vs A
  // B shouldn't exceed start much (soft)
  if (Hb!.price > H0!.price * 1.02) return null;

  const wA = H0!.price - La!.price;
  const wC = Hb!.price - Lc!.price;
  if (!(wA > 0 && wC > 0)) return null;
  const rC = fibRatio(wC, wA);
  let score = 45;
  const notes: string[] = [];
  if (near(rC, 1.0, 0.3) || near(rC, 1.618, 0.35)) {
    score += 20;
    notes.push(`C/A ${(rC ?? 0).toFixed(2)}`);
  }
  const bRet = fibRatio(Hb!.price - La!.price, wA);
  if (bRet != null && bRet >= 0.318 && bRet <= 0.786) {
    score += 15;
    notes.push(`B 되돌림 ${(bRet * 100).toFixed(0)}%`);
  }

  return {
    id: `abc-bear-${H0!.barIndex}-${Lc!.barIndex}`,
    kind: "corrective",
    direction: "bearish",
    pivots: [
      { ...H0!, label: null },
      { ...La!, label: "A" },
      { ...Hb!, label: "B" },
      { ...Lc!, label: "C" },
    ],
    score: Math.min(100, score),
    summary: `하락 조정 A–B–C · 점수 ${Math.min(100, score)}`,
    rulesOk: true,
    notes,
  };
}

function tryBearCorrective(
  seq: RawPivot[],
  i0: number,
): ElliottWavePattern | null {
  // ABC up after down: L H L H — A=H, B=L, C=H
  if (i0 + 3 >= seq.length) return null;
  const p = seq.slice(i0, i0 + 4);
  if (
    p[0]!.kind !== "low" ||
    p[1]!.kind !== "high" ||
    p[2]!.kind !== "low" ||
    p[3]!.kind !== "high"
  ) {
    return null;
  }
  const [L0, Ha, Lb, Hc] = p;
  if (Ha!.price <= L0!.price) return null;
  if (Lb!.price >= Ha!.price) return null;
  if (Hc!.price <= Ha!.price) return null;
  if (Lb!.price < L0!.price * 0.98) return null;

  const wA = Ha!.price - L0!.price;
  const wC = Hc!.price - Lb!.price;
  if (!(wA > 0 && wC > 0)) return null;
  const rC = fibRatio(wC, wA);
  let score = 45;
  const notes: string[] = [];
  if (near(rC, 1.0, 0.3) || near(rC, 1.618, 0.35)) {
    score += 20;
    notes.push(`C/A ${(rC ?? 0).toFixed(2)}`);
  }
  const bRet = fibRatio(Ha!.price - Lb!.price, wA);
  if (bRet != null && bRet >= 0.318 && bRet <= 0.786) {
    score += 15;
    notes.push(`B 되돌림 ${(bRet * 100).toFixed(0)}%`);
  }

  return {
    id: `abc-bull-${L0!.barIndex}-${Hc!.barIndex}`,
    kind: "corrective",
    direction: "bullish",
    pivots: [
      { ...L0!, label: null },
      { ...Ha!, label: "A" },
      { ...Lb!, label: "B" },
      { ...Hc!, label: "C" },
    ],
    score: Math.min(100, score),
    summary: `상승 조정 A–B–C · 점수 ${Math.min(100, score)}`,
    rulesOk: true,
    notes,
  };
}

/**
 * Mathematically constrained Elliott candidates from swing pivots.
 * Not a unique “true” count — absolute rules + fib heuristics only.
 */
export function detectElliottWaves(
  bars: OHLCVBar[],
  structure?: SwingStructureResult | null,
): ElliottWaveResult | null {
  if (bars.length < 30) return null;

  const raw =
    structure && structure.swings.length >= 6
      ? pivotsFromStructure(structure)
      : pivotsFromBars(bars);
  const seq = alternate(raw);
  if (seq.length < 6) {
    return { patterns: [], primary: [] };
  }

  const found: ElliottWavePattern[] = [];
  for (let i = 0; i < seq.length; i++) {
    const bull = tryBullImpulse(seq, i);
    if (bull) found.push(bull);
    const bear = tryBearImpulse(seq, i);
    if (bear) found.push(bear);
    const abcDown = tryBullCorrective(seq, i);
    if (abcDown) found.push(abcDown);
    const abcUp = tryBearCorrective(seq, i);
    if (abcUp) found.push(abcUp);
  }

  // Prefer recent, high score; dedupe overlapping same kind
  found.sort((a, b) => {
    const aEnd = a.pivots[a.pivots.length - 1]!.barIndex;
    const bEnd = b.pivots[b.pivots.length - 1]!.barIndex;
    if (bEnd !== aEnd) return bEnd - aEnd;
    return b.score - a.score;
  });

  const patterns: ElliottWavePattern[] = [];
  for (const p of found) {
    if (patterns.length >= MAX_PATTERNS) break;
    const end = p.pivots[p.pivots.length - 1]!.barIndex;
    const start = p.pivots[0]!.barIndex;
    const overlap = patterns.some((q) => {
      if (q.kind !== p.kind || q.direction !== p.direction) return false;
      const qs = q.pivots[0]!.barIndex;
      const qe = q.pivots[q.pivots.length - 1]!.barIndex;
      return !(end < qs || start > qe);
    });
    if (overlap) continue;
    patterns.push(p);
  }

  const bestImpulse = patterns
    .filter((p) => p.kind === "impulse")
    .sort((a, b) => b.score - a.score)[0];
  const bestCorrective = patterns
    .filter((p) => p.kind === "corrective")
    .sort((a, b) => b.score - a.score)[0];
  const primary = [bestImpulse, bestCorrective].filter(
    (p): p is ElliottWavePattern => p != null,
  );

  return { patterns, primary };
}
