import { Card, SectionTitle } from "./ui/Card";

import type { IndicatorResults } from "@/lib/types";

import { Badge } from "./ui/Badge";

import { ConfigError } from "@/lib/errors";



export function IndicatorPanel({ results }: { results: IndicatorResults }) {

  const rsi = results.indicators.rsi?.latest.rsi;

  const macdHist = results.indicators.macd?.latest.macdHist;

  const sma50 = results.indicators.sma?.latest["sma:50"];

  const sma200 = results.indicators.sma?.latest["sma:200"];



  if (rsi == null || macdHist == null || sma50 == null || sma200 == null) {

    throw new ConfigError(

      "IndicatorPanel: required indicators (RSI, MACD, SMA50, SMA200) not computed",

    );

  }



  return (

    <Card>

      <SectionTitle>기술 지표</SectionTitle>

      <div className="grid gap-3 text-left sm:grid-cols-2">

        <Metric label="RSI(14)" value={rsi.toFixed(2)} />

        <Metric label="MACD Hist" value={macdHist.toFixed(4)} />

        <Metric label="SMA 50" value={sma50.toFixed(2)} />

        <Metric label="SMA 200" value={sma200.toFixed(2)} />

      </div>

      <div className="mt-4 flex flex-wrap gap-2">

        {results.signals.map((s) => (

          <Badge key={s.id} variant={s.active ? "positive" : "muted"}>

            {s.id}: {s.active ? s.direction : "inactive"}

          </Badge>

        ))}

      </div>

    </Card>

  );

}



function Metric({ label, value }: { label: string; value: string }) {

  return (

    <div>

      <p className="text-xs text-text-tertiary">{label}</p>

      <p className="tabular-nums text-lg font-medium">{value}</p>

    </div>

  );

}

