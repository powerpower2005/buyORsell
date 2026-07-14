import type { OHLCVBar, TrendLabel } from "../types";
import { requireNonEmptyArray } from "../require";

export type SwingKind = "high" | "low";
export type SwingLabel = "HH" | "HL" | "LH" | "LL";
export type StructureRegime = "bullish" | "bearish" | "neutral";

/** Slope bands: 30–45° is ideal; steeper can warn of exhaustion. */
export type SlopeBand = "weak" | "ideal" | "overheated" | "unknown";
export type WidthBand = "narrow" | "normal" | "wide" | "unknown";
export type VolumeBand = "light" | "normal" | "heavy" | "unknown";
export type QualityGrade = "A" | "B" | "C" | "D" | "—";

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

/** Unbroken HH/HL (or LL/LH) run until the opposite family appears. */
export interface LabelFamilyStreak {
  /** Labels still in progress at the series end (0 if last label is the other family). */
  current: number;
  /** Longest unbroken run over the full history. */
  max: number;
  /** Count of each label inside the current run. */
  currentBreakdown: Partial<Record<SwingLabel, number>>;
  fromDate: string | null;
  toDate: string | null;
}

export interface StructureStreaks {
  /** HH/HL consecutive without LL/LH. */
  bullish: LabelFamilyStreak;
  /** LL/LH consecutive without HH/HL. */
  bearish: LabelFamilyStreak;
  /** Which family the latest labeled swing belongs to. */
  active: "bullish" | "bearish" | null;
  summary: string;
}

/** Quality of one swing leg (pivot → next pivot). */
export interface SwingLegQuality {
  fromDate: string;
  toDate: string;
  fromBarIndex: number;
  toBarIndex: number;
  fromKind: SwingKind;
  toKind: SwingKind;
  toLabel?: SwingLabel;
  barCount: number;
  /** ATR-normalized geometric angle in degrees. */
  slopeDegrees: number;
  slopeBand: SlopeBand;
  /** Absolute price span / ATR. */
  widthAtr: number;
  widthBand: WidthBand;
  /** Leg average volume / recent baseline average. */
  volumeRatio: number;
  volumeBand: VolumeBand;
  score: number;
  grade: QualityGrade;
  /** True when slope > 45° (exhaustion / mean-reversion risk). */
  overheated: boolean;
}

export interface StructureQualityCurrent {
  score: number;
  grade: QualityGrade;
  slopeDegrees: number | null;
  slopeBand: SlopeBand;
  widthAtr: number | null;
  widthBand: WidthBand;
  volumeRatio: number | null;
  volumeBand: VolumeBand;
  overheated: boolean;
  summary: string;
  caution: string | null;
}

export interface StructureQuality {
  atrPeriod: number;
  idealSlopeMinDeg: number;
  idealSlopeMaxDeg: number;
  legs: SwingLegQuality[];
  current: StructureQualityCurrent;
}

export interface SwingStructureResult {
  leftRight: number;
  swings: SwingPoint[];
  transitions: StructureTransition[];
  current: StructureCurrent;
  streaks: StructureStreaks;
  quality: StructureQuality;
}

export interface DetectSwingOptions {
  leftRight?: number;
  atrPeriod?: number;
  idealSlopeMinDeg?: number;
  idealSlopeMaxDeg?: number;
}

const DEFAULT_ATR_PERIOD = 14;
const IDEAL_SLOPE_MIN = 30;
const IDEAL_SLOPE_MAX = 45;
const VOLUME_BASELINE_BARS = 20;

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

function isBullishLabel(label: SwingLabel): boolean {
  return label === "HH" || label === "HL";
}

function emptyFamilyStreak(): LabelFamilyStreak {
  return {
    current: 0,
    max: 0,
    currentBreakdown: {},
    fromDate: null,
    toDate: null,
  };
}

function emptyStreaks(summary = "데이터 부족"): StructureStreaks {
  return {
    bullish: emptyFamilyStreak(),
    bearish: emptyFamilyStreak(),
    active: null,
    summary,
  };
}

function streakSummary(streaks: Omit<StructureStreaks, "summary">): string {
  if (streaks.active === "bullish" && streaks.bullish.current > 0) {
    return `HH/HL ${streaks.bullish.current}연속 (최장 ${streaks.bullish.max})`;
  }
  if (streaks.active === "bearish" && streaks.bearish.current > 0) {
    return `LL/LH ${streaks.bearish.current}연속 (최장 ${streaks.bearish.max})`;
  }
  return `HH/HL 최장 ${streaks.bullish.max} · LL/LH 최장 ${streaks.bearish.max}`;
}

/**
 * Count unbroken HH/HL runs (stopped by LL/LH) and LL/LH runs (stopped by HH/HL).
 */
export function computeLabelStreaks(swings: SwingPoint[]): StructureStreaks {
  const labeled = swings.filter(
    (s): s is SwingPoint & { label: SwingLabel } => s.label != null,
  );
  if (!labeled.length) return emptyStreaks("라벨 없음");

  let bullMax = 0;
  let bearMax = 0;
  let run = 0;
  let runSide: "bullish" | "bearish" | null = null;

  for (const s of labeled) {
    const side = isBullishLabel(s.label) ? "bullish" : "bearish";
    if (side === runSide) {
      run += 1;
    } else {
      runSide = side;
      run = 1;
    }
    if (side === "bullish") bullMax = Math.max(bullMax, run);
    else bearMax = Math.max(bearMax, run);
  }

  const lastLabel = labeled[labeled.length - 1].label;
  const active: "bullish" | "bearish" = isBullishLabel(lastLabel)
    ? "bullish"
    : "bearish";

  let current = 0;
  for (let i = labeled.length - 1; i >= 0; i--) {
    const side = isBullishLabel(labeled[i].label) ? "bullish" : "bearish";
    if (side !== active) break;
    current += 1;
  }
  const runStart = labeled[labeled.length - current];
  const runEnd = labeled[labeled.length - 1];
  const breakdown: Partial<Record<SwingLabel, number>> = {};
  for (let i = labeled.length - current; i < labeled.length; i++) {
    const lab = labeled[i].label;
    breakdown[lab] = (breakdown[lab] ?? 0) + 1;
  }

  const bullish = emptyFamilyStreak();
  bullish.max = bullMax;
  const bearish = emptyFamilyStreak();
  bearish.max = bearMax;

  if (active === "bullish") {
    bullish.current = current;
    bullish.currentBreakdown = breakdown;
    bullish.fromDate = runStart.date;
    bullish.toDate = runEnd.date;
  } else {
    bearish.current = current;
    bearish.currentBreakdown = breakdown;
    bearish.fromDate = runStart.date;
    bearish.toDate = runEnd.date;
  }

  const base = { bullish, bearish, active };
  return { ...base, summary: streakSummary(base) };
}

function trueRange(bars: OHLCVBar[], i: number): number {
  const bar = bars[i];
  const range = bar.high - bar.low;
  if (i === 0) return range;
  const prevClose = bars[i - 1].close;
  return Math.max(
    range,
    Math.abs(bar.high - prevClose),
    Math.abs(bar.low - prevClose),
  );
}

/** Wilder-style ATR ending at index `i` (needs atrPeriod bars of history). */
function atrAt(bars: OHLCVBar[], i: number, period: number): number {
  const start = Math.max(0, i - period + 1);
  let sum = 0;
  let count = 0;
  for (let j = start; j <= i; j++) {
    sum += trueRange(bars, j);
    count += 1;
  }
  return count > 0 ? sum / count : Math.max(bars[i].high - bars[i].low, 1e-9);
}

function meanVolume(bars: OHLCVBar[], from: number, to: number): number {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(bars.length - 1, Math.max(from, to));
  if (b < a) return 0;
  let sum = 0;
  for (let i = a; i <= b; i++) sum += bars[i].volume;
  return sum / (b - a + 1);
}

function slopeBandFor(deg: number, minDeg: number, maxDeg: number): SlopeBand {
  if (!Number.isFinite(deg)) return "unknown";
  if (deg < minDeg) return "weak";
  if (deg > maxDeg) return "overheated";
  return "ideal";
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

function emptyQuality(
  atrPeriod: number,
  idealMin: number,
  idealMax: number,
  summary = "데이터 부족",
): StructureQuality {
  return {
    atrPeriod,
    idealSlopeMinDeg: idealMin,
    idealSlopeMaxDeg: idealMax,
    legs: [],
    current: {
      score: 0,
      grade: "—",
      slopeDegrees: null,
      slopeBand: "unknown",
      widthAtr: null,
      widthBand: "unknown",
      volumeRatio: null,
      volumeBand: "unknown",
      overheated: false,
      summary,
      caution: null,
    },
  };
}

function scoreLeg(
  slopeBand: SlopeBand,
  widthBand: WidthBand,
  volumeBand: VolumeBand,
): number {
  const slopeScore =
    slopeBand === "ideal"
      ? 100
      : slopeBand === "weak"
        ? 42
        : slopeBand === "overheated"
          ? 38
          : 50;
  const widthScore =
    widthBand === "wide"
      ? 90
      : widthBand === "normal"
        ? 78
        : widthBand === "narrow"
          ? 40
          : 50;
  const volumeScore =
    volumeBand === "heavy"
      ? 92
      : volumeBand === "normal"
        ? 72
        : volumeBand === "light"
          ? 36
          : 50;
  return Math.round(0.45 * slopeScore + 0.3 * widthScore + 0.25 * volumeScore);
}

function classifyWidth(
  widthAtr: number,
  medianWidth: number | null,
): WidthBand {
  if (!Number.isFinite(widthAtr) || widthAtr <= 0) return "unknown";
  if (medianWidth != null && medianWidth > 0) {
    if (widthAtr < medianWidth * 0.7) return "narrow";
    if (widthAtr > medianWidth * 1.5) return "wide";
    return "normal";
  }
  if (widthAtr < 1) return "narrow";
  if (widthAtr > 3) return "wide";
  return "normal";
}

function classifyVolume(ratio: number): VolumeBand {
  if (!Number.isFinite(ratio) || ratio <= 0) return "unknown";
  if (ratio < 0.8) return "light";
  if (ratio > 1.5) return "heavy";
  return "normal";
}

function buildLegs(
  bars: OHLCVBar[],
  swings: SwingPoint[],
  atrPeriod: number,
  idealMin: number,
  idealMax: number,
): SwingLegQuality[] {
  if (swings.length < 2) return [];

  const raw: Omit<SwingLegQuality, "widthBand" | "score" | "grade">[] = [];

  for (let i = 1; i < swings.length; i++) {
    const from = swings[i - 1];
    const to = swings[i];
    const barCount = Math.max(1, to.barIndex - from.barIndex);
    const atr = Math.max(atrAt(bars, to.barIndex, atrPeriod), 1e-9);
    const priceSpan = Math.abs(to.price - from.price);
    const widthAtr = priceSpan / atr;
    // 1 ATR per bar ≈ 45°. Normalized so chart geometry is scale-stable.
    const slopeDegrees =
      (Math.atan(widthAtr / barCount) * 180) / Math.PI;

    const legVol = meanVolume(bars, from.barIndex, to.barIndex);
    const baseFrom = Math.max(0, from.barIndex - VOLUME_BASELINE_BARS);
    const baseTo = Math.max(0, from.barIndex - 1);
    const baseVol =
      baseTo >= baseFrom ? meanVolume(bars, baseFrom, baseTo) : legVol;
    const volumeRatio = baseVol > 0 ? legVol / baseVol : 1;

    const slopeBand = slopeBandFor(slopeDegrees, idealMin, idealMax);
    const volumeBand = classifyVolume(volumeRatio);

    raw.push({
      fromDate: from.date,
      toDate: to.date,
      fromBarIndex: from.barIndex,
      toBarIndex: to.barIndex,
      fromKind: from.kind,
      toKind: to.kind,
      toLabel: to.label,
      barCount,
      slopeDegrees,
      slopeBand,
      widthAtr,
      volumeRatio,
      volumeBand,
      overheated: slopeBand === "overheated",
    });
  }

  const widths = raw.map((r) => r.widthAtr).sort((a, b) => a - b);
  const medianWidth =
    widths.length > 0
      ? widths.length % 2 === 1
        ? widths[(widths.length - 1) / 2]
        : (widths[widths.length / 2 - 1] + widths[widths.length / 2]) / 2
      : null;

  return raw.map((r) => {
    const widthBand = classifyWidth(r.widthAtr, medianWidth);
    const score = scoreLeg(r.slopeBand, widthBand, r.volumeBand);
    return {
      ...r,
      widthBand,
      score,
      grade: gradeFromScore(score),
    };
  });
}

function qualitySummary(parts: {
  grade: QualityGrade;
  slopeBand: SlopeBand;
  widthBand: WidthBand;
  volumeBand: VolumeBand;
  overheated: boolean;
}): { summary: string; caution: string | null } {
  const slopeKo =
    parts.slopeBand === "ideal"
      ? "기울기 적정(30–45°)"
      : parts.slopeBand === "weak"
        ? "기울기 완만(<30°)"
        : parts.slopeBand === "overheated"
          ? "기울기 과열(>45°)"
          : "기울기 미정";
  const widthKo =
    parts.widthBand === "wide"
      ? "파동 큼"
      : parts.widthBand === "narrow"
        ? "파동 작음"
        : parts.widthBand === "normal"
          ? "파동 보통"
          : "파동 미정";
  const volKo =
    parts.volumeBand === "heavy"
      ? "거래량 풍부"
      : parts.volumeBand === "light"
        ? "거래량 빈약"
        : parts.volumeBand === "normal"
          ? "거래량 보통"
          : "거래량 미정";

  const summary = `품질 ${parts.grade} · ${slopeKo} · ${widthKo} · ${volKo}`;
  const caution = parts.overheated
    ? "기울기가 45°를 넘어 과열·되돌림 위험이 큽니다. 추세 방향으로만 해석하지 마세요."
    : null;
  return { summary, caution };
}

function aggregateCurrentQuality(
  legs: SwingLegQuality[],
  idealMin: number,
  idealMax: number,
): StructureQualityCurrent {
  if (!legs.length) {
    return emptyQuality(DEFAULT_ATR_PERIOD, idealMin, idealMax).current;
  }

  // Prefer the latest 1–2 legs that define recent structure.
  const recent = legs.slice(-2);
  const score = Math.round(
    recent.reduce((s, l) => s + l.score, 0) / recent.length,
  );
  const avgSlope =
    recent.reduce((s, l) => s + l.slopeDegrees, 0) / recent.length;
  const avgWidth = recent.reduce((s, l) => s + l.widthAtr, 0) / recent.length;
  const avgVol = recent.reduce((s, l) => s + l.volumeRatio, 0) / recent.length;
  const slopeBand = slopeBandFor(avgSlope, idealMin, idealMax);
  const widthBand = classifyWidth(
    avgWidth,
    legs.map((l) => l.widthAtr).sort((a, b) => a - b)[
      Math.floor((legs.length - 1) / 2)
    ] ?? null,
  );
  const volumeBand = classifyVolume(avgVol);
  const overheated = recent.some((l) => l.overheated);
  const grade = gradeFromScore(score);
  const { summary, caution } = qualitySummary({
    grade,
    slopeBand,
    widthBand,
    volumeBand,
    overheated,
  });

  return {
    score,
    grade,
    slopeDegrees: avgSlope,
    slopeBand,
    widthAtr: avgWidth,
    widthBand,
    volumeRatio: avgVol,
    volumeBand,
    overheated,
    summary,
    caution,
  };
}

/**
 * Fractal pivots → HH/HL/LH/LL labels → bullish/bearish regime continuity + flips.
 * Also scores leg quality: slope (30–45° ideal), width (ATR), volume vs baseline.
 */
export function detectSwingStructure(
  bars: OHLCVBar[],
  options?: DetectSwingOptions,
): SwingStructureResult {
  requireNonEmptyArray(bars, "OHLCV bars for swing structure");
  const n = options?.leftRight ?? 3;
  const atrPeriod = options?.atrPeriod ?? DEFAULT_ATR_PERIOD;
  const idealMin = options?.idealSlopeMinDeg ?? IDEAL_SLOPE_MIN;
  const idealMax = options?.idealSlopeMaxDeg ?? IDEAL_SLOPE_MAX;
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
      streaks: emptyStreaks(),
      quality: emptyQuality(atrPeriod, idealMin, idealMax),
    };
  }

  type RawPivot = { idx: number; kind: SwingKind; price: number };
  const pivots: RawPivot[] = [];

  for (let i = n; i < bars.length - n; i++) {
    const high = isSwingHigh(bars, i, n);
    const low = isSwingLow(bars, i, n);
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

  const legs = buildLegs(bars, swings, atrPeriod, idealMin, idealMax);
  const qualityCurrent = aggregateCurrentQuality(legs, idealMin, idealMax);
  const streaks = computeLabelStreaks(swings);

  return {
    leftRight: n,
    swings,
    transitions,
    current: {
      ...currentBase,
      summary: summaryFor(currentBase),
    },
    streaks,
    quality: {
      atrPeriod,
      idealSlopeMinDeg: idealMin,
      idealSlopeMaxDeg: idealMax,
      legs,
      current: qualityCurrent,
    },
  };
}

export function structureRegimeLabel(regime: StructureRegime): string {
  if (regime === "bullish") return "상승 (HH+HL)";
  if (regime === "bearish") return "하락 (LL+LH)";
  return "중립/혼합";
}

export function slopeBandLabel(band: SlopeBand): string {
  if (band === "ideal") return "적정 (30–45°)";
  if (band === "weak") return "완만 (<30°)";
  if (band === "overheated") return "과열 (>45°)";
  return "미정";
}

export function qualityGradeVariant(
  grade: QualityGrade,
): "positive" | "negative" | "muted" {
  if (grade === "A" || grade === "B") return "positive";
  if (grade === "D") return "negative";
  return "muted";
}

export function swingLabelDirection(label: SwingLabel): TrendLabel {
  if (label === "HH" || label === "HL") return "bullish";
  return "bearish";
}
