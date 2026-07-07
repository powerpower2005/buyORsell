import type { MTFAlignment, TrendLabel, Timeframe } from "../types";
import type { IndicatorResults } from "../types";
import timeframesConfig from "../../../config/timeframes.json";

function trendFromResults(results: IndicatorResults): TrendLabel {
  const rsi = results.indicators.rsi?.latest.rsi;
  const macdHist = results.indicators.macd?.latest.macdHist;
  let score = 0;
  if (rsi != null) {
    if (rsi > 55) score++;
    if (rsi < 45) score--;
  }
  if (macdHist != null) {
    if (macdHist > 0) score++;
    if (macdHist < 0) score--;
  }
  const above200 = results.signals.find((s) => s.id === "above_sma200")?.active;
  if (above200) score++;
  if (score >= 2) return "bullish";
  if (score <= -1) return "bearish";
  return "neutral";
}

export function computeMTFAlignment(
  byTf: Partial<Record<Timeframe, IndicatorResults>>,
): MTFAlignment {
  const enabledTfs = Object.entries(timeframesConfig.timeframes)
    .filter(([, cfg]) => cfg.enabled)
    .map(([tf]) => tf as Timeframe);

  if (enabledTfs.length < 2) {
    return { alignmentPct: 0, byTimeframe: {}, enabled: false };
  }

  const labels: Record<string, TrendLabel> = {};
  for (const tf of enabledTfs) {
    const res = byTf[tf];
    if (res) labels[tf] = trendFromResults(res);
  }

  const values = Object.values(labels);
  if (values.length < 2) {
    return { alignmentPct: 0, byTimeframe: labels, enabled: false };
  }

  const bullish = values.filter((v) => v === "bullish").length;
  const bearish = values.filter((v) => v === "bearish").length;
  const dominant = Math.max(bullish, bearish, values.length - bullish - bearish);
  const alignmentPct = Math.round((dominant / values.length) * 100);

  return { alignmentPct, byTimeframe: labels, enabled: true };
}
