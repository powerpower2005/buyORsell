import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { HelpTip } from "./HelpTip";
import {
  addIndicatorPeriod,
  getEffectiveIndicatorsConfig,
  removeIndicatorPeriod,
  resetOverrides,
  setIndicatorEnabled,
  setIndicatorParam,
  setIndicatorPeriodAt,
  setIndicatorNamedColor,
  setIndicatorPeriodColor,
  setIndicatorThreshold,
} from "@/lib/configStore";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  resolveBbBandColor,
} from "@/lib/bbOverlay";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  INDICATOR_HELP,
  PARAM_HELP,
  type HelpContent,
} from "@/lib/indicatorHelp";
import { Button } from "./ui/Button";
import { ConfigError } from "@/lib/errors";
import { requireNumber } from "@/lib/require";

interface Props {
  onChange: () => void;
}

function LabelWithHelp({
  label,
  help,
}: {
  label: string;
  help?: HelpContent;
}) {
  return (
    <span className="mb-1 flex items-center gap-1.5">
      <span>{label}</span>
      {help && <HelpTip help={help} />}
    </span>
  );
}

function NumInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  help?: HelpContent;
}) {
  return (
    <label className="block text-sm text-text-secondary">
      <LabelWithHelp label={label} help={help} />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 tabular-nums text-text-primary outline-none focus:border-accent"
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(max, Math.max(min, n)));
        }}
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
  help,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  help?: HelpContent;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <span>{title}</span>
          {help && <HelpTip help={help} />}
        </p>
        <Toggle label="사용" checked={enabled} onChange={onEnabledChange} />
      </div>
      {enabled ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}

function PeriodListEditor({
  indicatorId,
  title,
  periods,
  colors,
  min,
  max,
  maxCount = 8,
  onChange,
}: {
  indicatorId: string;
  title: string;
  periods: number[];
  colors: Record<string, string>;
  min: number;
  max: number;
  maxCount?: number;
  onChange: () => void;
}) {
  return (
    <div className="space-y-3">
      {periods.map((period, i) => {
        const color = resolvePeriodColor(colors, period, i);
        return (
          <div
            key={`${indicatorId}-${i}-${period}`}
            className="rounded-md border border-border/80 bg-surface-elevated/40 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-primary">
                {title} · Period {i + 1}
              </span>
              <button
                type="button"
                disabled={periods.length <= 1}
                className="text-xs text-text-tertiary hover:text-negative disabled:opacity-30"
                onClick={() => {
                  removeIndicatorPeriod(indicatorId, i);
                  onChange();
                }}
              >
                삭제
              </button>
            </div>
            <NumInput
              label="Period"
              help={PARAM_HELP["ma.period"]}
              value={period}
              min={min}
              max={max}
              onChange={(v) => {
                setIndicatorPeriodAt(indicatorId, i, v);
                onChange();
              }}
            />
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                <span>색상</span>
                <HelpTip help={PARAM_HELP["ma.color"]} />
              </p>
              <ColorSwatchPicker
                value={color}
                onChange={(c) => {
                  setIndicatorPeriodColor(indicatorId, period, c);
                  onChange();
                }}
              />
            </div>
          </div>
        );
      })}
      <Button
        variant="secondary"
        disabled={periods.length >= maxCount}
        onClick={() => {
          addIndicatorPeriod(indicatorId);
          onChange();
        }}
      >
        Period 추가
      </Button>
    </div>
  );
}

/** SMA/EMA/RSI/… period·색·사용 CRUD. Parent remounts via onChange tick. */
export function IndicatorConfigForm({ onChange }: Props) {
  const cfg = getEffectiveIndicatorsConfig();
  const find = (id: string) => cfg.indicators.find((i) => i.id === id);

  const sma = find("sma");
  const ema = find("ema");
  const rsi = find("rsi");
  const macd = find("macd");
  const bb = find("bb");
  const mfi = find("mfi");
  const atr = find("atr");

  if (!sma || !ema || !rsi || !macd || !bb || !atr) {
    throw new ConfigError("IndicatorConfigForm: missing indicator definitions");
  }

  const smaPeriods = (sma.params.periods as number[]) ?? [20, 50, 200];
  const emaPeriods = (ema.params.periods as number[]) ?? [12, 26];
  const smaColors = parsePeriodColors(sma.params.colors);
  const emaColors = parsePeriodColors(ema.params.colors);

  const patch = () => onChange();

  return (
    <div className="space-y-3 text-left">
      <p className="text-xs text-text-tertiary">
        브라우저에 저장됩니다. 변경 즉시 점수·지표·차트에 반영됩니다. 「?」를
        누르면 지표·설정값 설명을 볼 수 있습니다.
      </p>

      <IndicatorSection
        title="SMA"
        help={INDICATOR_HELP.sma}
        enabled={sma.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("sma", v);
          patch();
        }}
      >
        <PeriodListEditor
          indicatorId="sma"
          title="SMA"
          periods={smaPeriods}
          colors={smaColors}
          min={2}
          max={250}
          onChange={patch}
        />
      </IndicatorSection>

      <IndicatorSection
        title="EMA"
        help={INDICATOR_HELP.ema}
        enabled={ema.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("ema", v);
          patch();
        }}
      >
        <PeriodListEditor
          indicatorId="ema"
          title="EMA"
          periods={emaPeriods}
          colors={emaColors}
          min={2}
          max={100}
          onChange={patch}
        />
      </IndicatorSection>

      <IndicatorSection
        title="RSI"
        help={INDICATOR_HELP.rsi}
        enabled={rsi.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("rsi", v);
          patch();
        }}
      >
        <NumInput
          label="Period"
          help={PARAM_HELP["rsi.period"]}
          value={requireNumber(rsi.params.period, "rsi.period")}
          min={2}
          max={50}
          onChange={(v) => {
            setIndicatorParam("rsi", "period", v);
            patch();
          }}
        />
        <NumInput
          label="Overbought"
          help={PARAM_HELP["rsi.overbought"]}
          value={requireNumber(rsi.overbought, "rsi.overbought")}
          min={50}
          max={95}
          onChange={(v) => {
            setIndicatorThreshold("rsi", "overbought", v);
            patch();
          }}
        />
        <NumInput
          label="Oversold"
          help={PARAM_HELP["rsi.oversold"]}
          value={requireNumber(rsi.oversold, "rsi.oversold")}
          min={5}
          max={50}
          onChange={(v) => {
            setIndicatorThreshold("rsi", "oversold", v);
            patch();
          }}
        />
      </IndicatorSection>

      <IndicatorSection
        title="MACD"
        help={INDICATOR_HELP.macd}
        enabled={macd.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("macd", v);
          patch();
        }}
      >
        <NumInput
          label="Fast"
          help={PARAM_HELP["macd.fast"]}
          value={requireNumber(macd.params.fast, "macd.fast")}
          min={2}
          max={50}
          onChange={(v) => {
            setIndicatorParam("macd", "fast", v);
            patch();
          }}
        />
        <NumInput
          label="Slow"
          help={PARAM_HELP["macd.slow"]}
          value={requireNumber(macd.params.slow, "macd.slow")}
          min={5}
          max={100}
          onChange={(v) => {
            setIndicatorParam("macd", "slow", v);
            patch();
          }}
        />
        <NumInput
          label="Signal"
          help={PARAM_HELP["macd.signal"]}
          value={requireNumber(macd.params.signal, "macd.signal")}
          min={2}
          max={30}
          onChange={(v) => {
            setIndicatorParam("macd", "signal", v);
            patch();
          }}
        />
      </IndicatorSection>

      <IndicatorSection
        title="Bollinger Bands"
        help={INDICATOR_HELP.bb}
        enabled={bb.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("bb", v);
          patch();
        }}
      >
        <NumInput
          label="Period"
          help={PARAM_HELP["bb.period"]}
          value={requireNumber(bb.params.period, "bb.period")}
          min={5}
          max={100}
          onChange={(v) => {
            setIndicatorParam("bb", "period", v);
            patch();
          }}
        />
        <NumInput
          label="Std Dev"
          help={PARAM_HELP["bb.stdDev"]}
          value={requireNumber(bb.params.stdDev, "bb.stdDev")}
          min={0.5}
          max={5}
          step={0.5}
          onChange={(v) => {
            setIndicatorParam("bb", "stdDev", v);
            patch();
          }}
        />
        <div className="space-y-3 pt-1">
          {BB_BAND_ORDER.map((band) => {
            const colors = parsePeriodColors(bb.params.colors);
            const color = resolveBbBandColor(colors, band);
            return (
              <div key={band}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                  <span>{BB_BAND_META[band].labelKo} 색상</span>
                  <HelpTip help={PARAM_HELP["bb.color"]} />
                </p>
                <ColorSwatchPicker
                  value={color}
                  onChange={(c) => {
                    setIndicatorNamedColor("bb", band, c);
                    patch();
                  }}
                />
              </div>
            );
          })}
        </div>
      </IndicatorSection>

      {mfi && (
        <IndicatorSection
          title="MFI"
          help={INDICATOR_HELP.mfi}
          enabled={mfi.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("mfi", v);
            patch();
          }}
        >
          <NumInput
            label="Period"
            help={PARAM_HELP["mfi.period"]}
            value={requireNumber(mfi.params.period, "mfi.period")}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("mfi", "period", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      <IndicatorSection
        title="ATR"
        help={INDICATOR_HELP.atr}
        enabled={atr.enabled}
        onEnabledChange={(v) => {
          setIndicatorEnabled("atr", v);
          patch();
        }}
      >
        <NumInput
          label="Period"
          help={PARAM_HELP["atr.period"]}
          value={requireNumber(atr.params.period, "atr.period")}
          min={2}
          max={50}
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
  );
}
