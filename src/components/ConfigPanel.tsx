import { Card, SectionTitle } from "./ui/Card";
import {
  getEffectiveIndicatorsConfig,
  resetOverrides,
  setIndicatorEnabled,
  setIndicatorParam,
  setIndicatorPeriodAt,
  setIndicatorThreshold,
} from "@/lib/configStore";
import { Button } from "./ui/Button";
import { ConfigError } from "@/lib/errors";
import { requireNumber } from "@/lib/require";

interface Props {
  onChange: () => void;
}

function NumField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm text-text-secondary">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-text-primary">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="mt-1.5 w-full accent-accent"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-text-secondary">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        className="h-4 w-4 accent-accent"
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function IndicatorSection({
  title,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <Toggle label="사용" checked={enabled} onChange={onEnabledChange} />
      </div>
      {enabled ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}

export function ConfigPanel({ onChange }: Props) {
  const cfg = getEffectiveIndicatorsConfig();
  const find = (id: string) => cfg.indicators.find((i) => i.id === id);

  const sma = find("sma");
  const ema = find("ema");
  const rsi = find("rsi");
  const macd = find("macd");
  const bb = find("bb");
  const atr = find("atr");

  if (!sma || !ema || !rsi || !macd || !bb || !atr) {
    throw new ConfigError("ConfigPanel: missing indicator definitions");
  }

  const smaPeriods = (sma.params.periods as number[]) ?? [20, 50, 200];
  const emaPeriods = (ema.params.periods as number[]) ?? [12, 26];

  const patch = () => onChange();

  return (
    <Card>
      <SectionTitle>기술 지표 설정</SectionTitle>
      <p className="mb-4 text-xs text-text-tertiary">
        브라우저에 저장됩니다. 변경 즉시 점수·지표에 반영됩니다.
      </p>

      <div className="space-y-3 text-left">
        <IndicatorSection
          title="SMA"
          enabled={sma.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("sma", v);
            patch();
          }}
        >
          {smaPeriods.map((period, i) => (
            <NumField
              key={`sma-${i}`}
              label={`Period ${i + 1}`}
              value={period}
              min={5}
              max={250}
              onChange={(v) => {
                setIndicatorPeriodAt("sma", i, v);
                patch();
              }}
            />
          ))}
        </IndicatorSection>

        <IndicatorSection
          title="EMA"
          enabled={ema.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("ema", v);
            patch();
          }}
        >
          {emaPeriods.map((period, i) => (
            <NumField
              key={`ema-${i}`}
              label={`Period ${i + 1}`}
              value={period}
              min={2}
              max={100}
              onChange={(v) => {
                setIndicatorPeriodAt("ema", i, v);
                patch();
              }}
            />
          ))}
        </IndicatorSection>

        <IndicatorSection
          title="RSI"
          enabled={rsi.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("rsi", v);
            patch();
          }}
        >
          <NumField
            label="Period"
            value={requireNumber(rsi.params.period, "rsi.period")}
            min={5}
            max={30}
            onChange={(v) => {
              setIndicatorParam("rsi", "period", v);
              patch();
            }}
          />
          <NumField
            label="Overbought"
            value={requireNumber(rsi.overbought, "rsi.overbought")}
            min={60}
            max={90}
            onChange={(v) => {
              setIndicatorThreshold("rsi", "overbought", v);
              patch();
            }}
          />
          <NumField
            label="Oversold"
            value={requireNumber(rsi.oversold, "rsi.oversold")}
            min={10}
            max={40}
            onChange={(v) => {
              setIndicatorThreshold("rsi", "oversold", v);
              patch();
            }}
          />
        </IndicatorSection>

        <IndicatorSection
          title="MACD"
          enabled={macd.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("macd", v);
            patch();
          }}
        >
          <NumField
            label="Fast"
            value={requireNumber(macd.params.fast, "macd.fast")}
            min={2}
            max={30}
            onChange={(v) => {
              setIndicatorParam("macd", "fast", v);
              patch();
            }}
          />
          <NumField
            label="Slow"
            value={requireNumber(macd.params.slow, "macd.slow")}
            min={10}
            max={50}
            onChange={(v) => {
              setIndicatorParam("macd", "slow", v);
              patch();
            }}
          />
          <NumField
            label="Signal"
            value={requireNumber(macd.params.signal, "macd.signal")}
            min={2}
            max={20}
            onChange={(v) => {
              setIndicatorParam("macd", "signal", v);
              patch();
            }}
          />
        </IndicatorSection>

        <IndicatorSection
          title="Bollinger Bands"
          enabled={bb.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("bb", v);
            patch();
          }}
        >
          <NumField
            label="Period"
            value={requireNumber(bb.params.period, "bb.period")}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("bb", "period", v);
              patch();
            }}
          />
          <NumField
            label="Std Dev"
            value={requireNumber(bb.params.stdDev, "bb.stdDev")}
            min={1}
            max={4}
            step={0.5}
            onChange={(v) => {
              setIndicatorParam("bb", "stdDev", v);
              patch();
            }}
          />
        </IndicatorSection>

        <IndicatorSection
          title="ATR"
          enabled={atr.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("atr", v);
            patch();
          }}
        >
          <NumField
            label="Period"
            value={requireNumber(atr.params.period, "atr.period")}
            min={5}
            max={30}
            onChange={(v) => {
              setIndicatorParam("atr", "period", v);
              patch();
            }}
          />
        </IndicatorSection>

        <Button
          variant="secondary"
          onClick={() => {
            resetOverrides();
            patch();
          }}
        >
          기본값으로 초기화
        </Button>
      </div>
    </Card>
  );
}
