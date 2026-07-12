import type { OHLCVBar, QuoteFile, Timeframe } from "./types";

import dataPolicy from "../../config/data-policy.json";

import { ConfigError } from "./errors";

import { requireDefined } from "./require";

import {
  tradingDayLag,
  usesTradingDayFreshness,
} from "./freshness";



export interface FreshnessResult {

  status: "fresh" | "stale" | "missing";

  reason: string;

}



export function validateFreshness(

  quote: QuoteFile | null,

  timeframe: Timeframe = "1d",

): FreshnessResult {

  if (!quote) {

    return { status: "missing", reason: "no file" };

  }



  const policy = dataPolicy;

  if (!policy.freshness?.maxAgeHours) {

    throw new ConfigError("data-policy.json: freshness.maxAgeHours is required");

  }

  if (policy.freshness.minBarCount == null) {

    throw new ConfigError("data-policy.json: freshness.minBarCount is required");

  }

  if (policy.freshness.maxTradingDayLag == null) {

    throw new ConfigError(

      "data-policy.json: freshness.maxTradingDayLag is required",

    );

  }



  if (quote.barCount < policy.freshness.minBarCount) {

    return { status: "stale", reason: "minBarCount" };

  }



  if (usesTradingDayFreshness(timeframe)) {

    const lag = tradingDayLag(quote.lastBarDate);

    if (lag > policy.freshness.maxTradingDayLag) {

      return {

        status: "stale",

        reason: `lastBarDate ${lag} trading day(s) behind`,

      };

    }

    return { status: "fresh", reason: "ok" };

  }



  const tfPolicy =

    (policy.freshnessByTimeframe as Record<string, { maxAgeHours?: number }>)?.[

      timeframe

    ];

  const maxAgeHours = requireDefined(

    tfPolicy?.maxAgeHours ?? policy.freshness.maxAgeHours,

    `freshness maxAgeHours for ${timeframe}`,

  );



  const ageMs = Date.now() - new Date(quote.fetchedAt).getTime();

  if (ageMs > maxAgeHours * 3600 * 1000) {

    return { status: "stale", reason: "maxAgeHours exceeded" };

  }



  return { status: "fresh", reason: "ok" };

}



export function mergeOhlcv(

  existing: OHLCVBar[],

  incoming: OHLCVBar[],

): { ohlcv: OHLCVBar[]; changedBars: number; hasDiff: boolean } {

  const byDate = new Map(existing.map((b) => [b.date, b]));

  let changed = 0;

  for (const bar of incoming) {

    const prev = byDate.get(bar.date);

    if (

      !prev ||

      prev.open !== bar.open ||

      prev.high !== bar.high ||

      prev.low !== bar.low ||

      prev.close !== bar.close ||

      prev.volume !== bar.volume

    ) {

      byDate.set(bar.date, bar);

      changed++;

    }

  }

  const ohlcv = [...byDate.entries()]

    .sort(([a], [b]) => a.localeCompare(b))

    .map(([, b]) => b);

  return { ohlcv, changedBars: changed, hasDiff: changed > 0 };

}
