import type { IndicatorResults, OHLCVBar, QuoteFile, SeriesPoint } from "./types";

export interface IndicatorYamlOptions {
  from?: string;
  to?: string;
}

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
  bars: Array<Record<string, string | number>>;
}): string {
  const lines: string[] = [
    `t: ${yamlScalar(doc.t)}`,
    `tf: ${yamlScalar(doc.tf)}`,
    `from: ${yamlScalar(doc.from)}`,
    `to: ${yamlScalar(doc.to)}`,
    "bars:",
  ];
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

/**
 * Compact YAML of OHLCV (+ enabled indicator series values) for a date range.
 * Only indicators present in `results` are included (computeAll skips disabled).
 */
export function buildIndicatorYaml(
  quote: Pick<QuoteFile, "ticker" | "timeframe" | "ohlcv">,
  results: IndicatorResults,
  options: IndicatorYamlOptions = {},
): string {
  const bars = filterBars(quote.ohlcv, options.from, options.to);
  if (!bars.length) {
    const from = options.from ?? quote.ohlcv[0]?.date ?? "";
    const to = options.to ?? quote.ohlcv.at(-1)?.date ?? "";
    return dumpYaml({
      t: quote.ticker,
      tf: quote.timeframe,
      from,
      to,
      bars: [],
    });
  }

  type IndexedSeries = { key: string; byDate: Map<string, number> };
  const seriesList: IndexedSeries[] = [];
  for (const out of Object.values(results.indicators)) {
    for (const [seriesKey, points] of Object.entries(out.series)) {
      seriesList.push({
        key: shortSeriesKey(seriesKey),
        byDate: indexByDate(points),
      });
    }
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
    bars: rows,
  });
}

/** Default export window: last `n` bars (inclusive). */
export function defaultYamlRange(
  bars: OHLCVBar[],
  n = 20,
): { from: string; to: string } {
  if (!bars.length) return { from: "", to: "" };
  const slice = bars.slice(-Math.max(1, n));
  return { from: slice[0].date, to: slice.at(-1)!.date };
}
