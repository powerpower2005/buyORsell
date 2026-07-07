import { useState } from "react";

import { Card, SectionTitle } from "./ui/Card";

import { getEffectiveIndicatorsConfig, setIndicatorParam, resetOverrides } from "@/lib/configStore";

import { Button } from "./ui/Button";

import { ConfigError } from "@/lib/errors";

import { requireNumber } from "@/lib/require";

import indicatorsBase from "../../config/indicators.json";



interface Props {

  onChange: () => void;

}



export function ConfigPanel({ onChange }: Props) {

  const cfg = getEffectiveIndicatorsConfig();

  const rsi = cfg.indicators.find((i) => i.id === "rsi");

  if (!rsi) {

    throw new ConfigError("ConfigPanel: rsi indicator missing from config");

  }

  const basePeriod = requireNumber(rsi.params.period, "rsi.period");

  const [rsiPeriod, setRsiPeriod] = useState(basePeriod);



  const resetPeriod = requireNumber(

    indicatorsBase.indicators.find((i) => i.id === "rsi")?.params.period,

    "indicators.json rsi.period",

  );



  return (

    <Card>

      <SectionTitle>Runtime Config</SectionTitle>

      <div className="space-y-4 text-left">

        <label className="block text-sm text-text-secondary">

          RSI Period: {rsiPeriod}

          <input

            type="range"

            min={5}

            max={30}

            value={rsiPeriod}

            className="mt-2 w-full"

            onChange={(e) => {

              const v = Number(e.target.value);

              setRsiPeriod(v);

              setIndicatorParam("rsi", "period", v);

              onChange();

            }}

          />

        </label>

        <Button

          variant="secondary"

          onClick={() => {

            resetOverrides();

            setRsiPeriod(resetPeriod);

            onChange();

          }}

        >

          기본값으로 초기화

        </Button>

      </div>

    </Card>

  );

}

