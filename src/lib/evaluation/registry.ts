import type { OHLCVBar, IndicatorResults, SignalResult, Timeframe, TrendLabel } from "../types";

import type { IndicatorsConfig, IndicatorPlugin, SignalConfig } from "./types";

import { allPlugins, indicatorHasOutput } from "./indicators/index";

import { ConfigError, InsufficientDataError } from "../errors";

import { requireDefined, requireNonEmptyArray, requireNumber } from "../require";



const registry = new Map<string, IndicatorPlugin>();

for (const p of allPlugins) registry.set(p.id, p);



export function register(plugin: IndicatorPlugin): void {

  registry.set(plugin.id, plugin);

}



function evalSignals(

  bars: OHLCVBar[],

  config: IndicatorsConfig,

  results: IndicatorResults["indicators"],

  timeframe: Timeframe,

): SignalResult[] {

  const signals: SignalResult[] = [];

  const lastBar = bars.at(-1);

  if (!lastBar) {

    throw new InsufficientDataError("No bars for signal evaluation");

  }

  const close = lastBar.close;



  for (const sig of config.signals) {

    if (sig.timeframes && !sig.timeframes.includes(timeframe)) continue;



    if (sig.type === "crossover") {

      const fastKey = requireDefined(sig.fast, `signal ${sig.id}.fast`);

      const slowKey = requireDefined(sig.slow, `signal ${sig.id}.slow`);

      const indId = fastKey.split(":")[0];

      const ind = results[indId];

      if (!ind) continue;

      const fastSeries = ind.series[fastKey];

      const slowSeries = ind.series[slowKey];

      if (!fastSeries?.length || !slowSeries?.length) continue;

      const f0 = fastSeries.at(-2)?.value;

      const f1 = fastSeries.at(-1)?.value;

      const s0 = slowSeries.at(-2)?.value;

      const s1 = slowSeries.at(-1)?.value;

      if (f0 == null || f1 == null || s0 == null || s1 == null) continue;

      const active = f0 <= s0 && f1 > s1;

      signals.push({

        id: sig.id,

        label: sig.id,

        active,

        direction: active ? "bullish" : "neutral",

      });

    }



    if (sig.type === "threshold") {

      requireDefined(sig.indicator, `signal ${sig.id}.indicator`);

      const val = requireNumber(sig.value, `signal ${sig.id}.value`);

      const rsi = results.rsi?.latest.rsi;

      if (rsi == null) continue;

      let active = false;

      let direction: TrendLabel = "neutral";

      if (sig.op === "lt") {

        active = rsi < val;

        direction = active ? "bullish" : "neutral";

      } else if (sig.op === "gt") {

        active = rsi > val;

        direction = active ? "bearish" : "neutral";

      } else {

        throw new ConfigError(`Signal ${sig.id}: unknown op ${sig.op}`);

      }

      signals.push({ id: sig.id, label: sig.id, active, direction });

    }

  }



  const sma200 = results.sma?.latest["sma:200"];

  if (sma200 != null) {

    const above = close > sma200;

    signals.push({

      id: "above_sma200",

      label: "Above SMA200",

      active: above,

      direction: above ? "bullish" : "bearish",

    });

  }



  return signals;

}



export function computeAll(

  bars: OHLCVBar[],

  timeframe: Timeframe,

  config: IndicatorsConfig,

): IndicatorResults {

  requireNonEmptyArray(bars, "OHLCV bars for indicators");

  const indicators: IndicatorResults["indicators"] = {};

  const skipped: string[] = [];



  for (const item of config.indicators) {

    if (!item.enabled) continue;

    if (item.timeframes && !item.timeframes.includes(timeframe)) continue;

    const plugin = registry.get(item.id);

    if (!plugin) {

      throw new ConfigError(`Unknown indicator plugin: ${item.id}`);

    }

    const min = plugin.minBars(item.params);

    if (bars.length < min) {
      skipped.push(
        `${item.id.toUpperCase()}: 최소 봉 ${min}개 필요 · 현재 ${bars.length}개라 계산을 건너뜁니다`,
      );
      continue;
    }

    const out = plugin.compute(bars, item.params);
    if (out.skipped?.length) skipped.push(...out.skipped);

    if (!indicatorHasOutput(out)) continue;

    indicators[item.id] = {
      id: item.id,
      series: out.series,
      latest: out.latest,
    };

  }



  const signals = evalSignals(bars, config, indicators, timeframe);

  return {

    indicators,

    signals,

    skipped: skipped.length ? skipped : undefined,

  };

}



export function getLatestRef(

  results: IndicatorResults,

  ref: string,

): number {

  if (ref === "close") {

    throw new ConfigError("getLatestRef: use bar close directly for 'close'");

  }

  const [ind] = ref.includes(":") ? ref.split(":") : [ref, ref];

  const fullKey = ref.includes(":") ? ref : ref;

  const out = results.indicators[ind];

  if (!out) {

    throw new InsufficientDataError(`Indicator not found for ref: ${ref}`);

  }

  const val = out.latest[fullKey] ?? out.latest[ref];

  if (val == null) {

    throw new InsufficientDataError(`Indicator value missing for ref: ${ref}`);

  }

  return val;

}



export type { IndicatorsConfig, SignalConfig };

