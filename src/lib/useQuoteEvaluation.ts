import { useEffect, useState } from "react";
import type { QuoteFile, Timeframe } from "./types";
import type { IndicatorsConfig } from "./evaluation/types";
import type { TrendlineAlgoVersion } from "./evaluation/trendlines";
import {
  evaluateQuote,
  type QuoteEvaluation,
} from "./evaluation/evaluateQuote";
import { evaluateAsync } from "./evaluation/evaluateAsync";
import { getEffectiveScoringConfig } from "./configStore";

export function useQuoteEvaluation(
  quote: QuoteFile | null,
  timeframe: Timeframe,
  config: IndicatorsConfig,
  trendlineAlgo: TrendlineAlgoVersion,
): QuoteEvaluation | null {
  const [state, setState] = useState<{
    quote: QuoteFile;
    config: IndicatorsConfig;
    timeframe: Timeframe;
    trendlineAlgo: TrendlineAlgoVersion;
    result: QuoteEvaluation;
  } | null>(null);
  useEffect(() => {
    if (!quote) return;
    const controller = new AbortController();
    const options = {
      trendlineAlgo,
      asOf: quote.fetchedAt,
      scoringConfig: getEffectiveScoringConfig(),
    };
    evaluateAsync([quote.ohlcv, timeframe, config, options], controller.signal)
      .then((result) =>
        setState({ quote, config, timeframe, trendlineAlgo, result }),
      )
      .catch((error) => {
        if (controller.signal.aborted) return;
        const result = evaluateQuote([], timeframe, config, options);
        result.fatalError =
          error instanceof Error ? error.message : String(error);
        setState({ quote, config, timeframe, trendlineAlgo, result });
      });
    return () => controller.abort();
  }, [quote, timeframe, config, trendlineAlgo]);
  return state?.quote === quote &&
    state.config === config &&
    state.timeframe === timeframe &&
    state.trendlineAlgo === trendlineAlgo
    ? state.result
    : null;
}
