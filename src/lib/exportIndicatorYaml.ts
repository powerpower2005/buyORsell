import { INDICATOR_HELP } from "./indicatorHelp";
import type { IndicatorResults, OHLCVBar, QuoteFile, SeriesPoint } from "./types";

export interface IndicatorYamlOptions {
  from?: string;
  to?: string;
}

/** Per-series field labels (within an indicator). */
const SERIES_PART_LABEL: Record<string, string> = {
  rsi: "RSI",
  rsiWeighted: "가중 RSI",
  rsiMid: "RSI 밴드 중심",
  rsiUpper: "RSI 밴드 상단",
  rsiLower: "RSI 밴드 하단",
  macd: "MACD",
  macdSignal: "시그널",
  macdHist: "히스토그램",
  bbUpper: "상단",
  bbMiddle: "중심",
  bbLower: "하단",
  bbPercentB: "%B",
  bbBandwidth: "Bandwidth",
  upper: "상단",
  middle: "중심",
  lower: "하단",
  mid: "중심",
  disparity: "이격도 %",
  sma: "기준 SMA",
  mfi: "MFI",
  atr: "ATR",
  stochK: "%K",
  stochD: "%D",
  obv: "OBV",
  obvSignal: "OBV 시그널",
  energy: "에너지(0–100)",
  slope: "기울기(+1/0/-1)",
  vwap: "VWAP",
  upper1: "상단 ×1",
  lower1: "하단 ×1",
  upper2: "상단 ×2",
  lower2: "하단 ×2",
  anchored: "앵커 VWAP",
  trend: "추세(+1/-1)",
  flip: "추세 전환",
  adx: "ADX",
  plusDI: "+DI",
  minusDI: "-DI",
  psar: "Parabolic SAR",
  cci: "CCI",
  supertrend: "슈퍼트렌드",
  direction: "방향(+1/-1)",
  tenkan: "전환선",
  kijun: "기준선",
  spanA: "선행스팬 A",
  spanB: "선행스팬 B",
  chikou: "후행스팬",
  ad: "A/D",
  chaikin: "Chaikin",
  eom: "EOM",
  eomSmooth: "EOM 스무딩",
  obvMid: "OBV Midpoint",
  boxRatio: "EquiVolume 비율",
  shape: "EquiVolume 형태(1–3)",
  widthNorm: "EquiVolume 폭",
};

const OHLCV_DEFS: Array<[string, string]> = [
  ["d", "date"],
  ["o", "open"],
  ["h", "high"],
  ["l", "low"],
  ["c", "close"],
  ["v", "volume"],
];

function roundNum(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (Number.isInteger(n)) return n;
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Series key → short YAML field (`sma:20` → `sma20`). */
export function shortSeriesKey(key: string): string {
  return key.replace(/:/g, "");
}

function indicatorTitle(id: string): string {
  return INDICATOR_HELP[id]?.title ?? id;
}

/** Human-readable definition for a series field in the YAML legend. */
export function describeSeriesField(indicatorId: string, seriesKey: string): string {
  const ma = seriesKey.match(/^(sma|ema):(\d+)$/i);
  if (ma) {
    const kind = ma[1]!.toUpperCase();
    const period = ma[2]!;
    return `${kind}(${period}) · ${indicatorTitle(ma[1]!.toLowerCase())}`;
  }

  const title = indicatorTitle(indicatorId);
  const part = SERIES_PART_LABEL[seriesKey];

  if (!part || seriesKey === indicatorId || part === title) {
    return title;
  }

  // Avoid "RSI · RSI (상대강도지수)…" when the part is already the acronym in the title.
  if (title.startsWith(part) || title.includes(`(${part})`)) {
    return title;
  }

  return `${part} · ${title}`;
}

function indexByDate(points: SeriesPoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of points) m.set(p.date, p.value);
  return m;
}

function filterBars(bars: OHLCVBar[], from?: string, to?: string): OHLCVBar[] {
  return bars.filter((b) => {
    if (from && b.date < from) return false;
    if (to && b.date > to) return false;
    return true;
  });
}

function yamlScalar(v: string | number): string {
  if (typeof v === "number") return String(v);
  if (/[:#{}[\],&*?|<>=!%@`]/.test(v) || /^\s|\s$/.test(v)) {
    return JSON.stringify(v);
  }
  return v;
}

function dumpYaml(doc: {
  t: string;
  tf: string;
  from: string;
  to: string;
  defs: Array<[string, string]>;
  bars: Array<Record<string, string | number>>;
}): string {
  const lines: string[] = [
    `t: ${yamlScalar(doc.t)}`,
    `tf: ${yamlScalar(doc.tf)}`,
    `from: ${yamlScalar(doc.from)}`,
    `to: ${yamlScalar(doc.to)}`,
    "defs:",
  ];
  for (const [k, desc] of doc.defs) {
    lines.push(`  ${k}: ${yamlScalar(desc)}`);
  }
  lines.push("bars:");
  for (const bar of doc.bars) {
    let first = true;
    for (const [k, v] of Object.entries(bar)) {
      if (first) {
        lines.push(`  - ${k}: ${yamlScalar(v)}`);
        first = false;
      } else {
        lines.push(`    ${k}: ${yamlScalar(v)}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}

function buildDefs(
  seriesMeta: Array<{ key: string; indicatorId: string; seriesKey: string }>,
): Array<[string, string]> {
  const defs: Array<[string, string]> = [...OHLCV_DEFS];
  const seen = new Set(OHLCV_DEFS.map(([k]) => k));
  for (const s of seriesMeta) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    defs.push([s.key, describeSeriesField(s.indicatorId, s.seriesKey)]);
  }
  return defs;
}

/**
 * Compact YAML of OHLCV (+ enabled indicator series values) for a date range.
 * Only indicators present in `results` are included (computeAll skips disabled).
 */
export function buildIndicatorYaml(
  quote: Pick<QuoteFile, "ticker" | "timeframe" | "ohlcv">,
  results: IndicatorResults,
  options: IndicatorYamlOptions = {},
): string {
  type IndexedSeries = {
    key: string;
    indicatorId: string;
    seriesKey: string;
    byDate: Map<string, number>;
  };

  const seriesList: IndexedSeries[] = [];
  for (const out of Object.values(results.indicators)) {
    for (const [seriesKey, points] of Object.entries(out.series)) {
      seriesList.push({
        key: shortSeriesKey(seriesKey),
        indicatorId: out.id,
        seriesKey,
        byDate: indexByDate(points),
      });
    }
  }

  const defs = buildDefs(seriesList);
  const bars = filterBars(quote.ohlcv, options.from, options.to);
  if (!bars.length) {
    const from = options.from ?? quote.ohlcv[0]?.date ?? "";
    const to = options.to ?? quote.ohlcv.at(-1)?.date ?? "";
    return dumpYaml({
      t: quote.ticker,
      tf: quote.timeframe,
      from,
      to,
      defs,
      bars: [],
    });
  }

  const rows: Array<Record<string, string | number>> = bars.map((b) => {
    const row: Record<string, string | number> = {
      d: b.date,
      o: roundNum(b.open),
      h: roundNum(b.high),
      l: roundNum(b.low),
      c: roundNum(b.close),
      v: b.volume,
    };
    for (const s of seriesList) {
      const val = s.byDate.get(b.date);
      if (val != null && Number.isFinite(val)) {
        row[s.key] = roundNum(val);
      }
    }
    return row;
  });

  return dumpYaml({
    t: quote.ticker,
    tf: quote.timeframe,
    from: bars[0].date,
    to: bars.at(-1)!.date,
    defs,
    bars: rows,
  });
}

function addUtcDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Default export window: last bar as `to`, one calendar week earlier as `from`. */
export function defaultYamlRange(bars: OHLCVBar[]): { from: string; to: string } {
  if (!bars.length) return { from: "", to: "" };
  const to = bars.at(-1)!.date;
  return { from: addUtcDays(to, -7), to };
}
