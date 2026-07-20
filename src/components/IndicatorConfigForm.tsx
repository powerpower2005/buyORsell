import { useEffect, useState } from "react";
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
import {
  ICHIMOKU_LINE_ORDER,
  ICHIMOKU_PART_META,
  resolveIchimokuColor,
} from "@/lib/ichimokuOverlay";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";
import {
  INDICATOR_HELP,
  PARAM_HELP,
  type HelpContent,
} from "@/lib/indicatorHelp";
import { Button } from "./ui/Button";
import { ConfigError } from "@/lib/errors";
import { requireNumber } from "@/lib/require";

export type IndicatorConfigSectionId =
  | "ma"
  | "sma"
  | "ema"
  | "rsi"
  | "macd"
  | "stoch"
  | "bb"
  | "mfi"
  | "atr"
  | "obv"
  | "keltner"
  | "vwap"
  | "adx"
  | "psar"
  | "cci"
  | "supertrend"
  | "ichimoku"
  | "all";

export const INDICATOR_CONFIG_SECTION_LABEL: Record<
  IndicatorConfigSectionId,
  string
> = {
  all: "기술 지표",
  ma: "이동평균",
  sma: "SMA",
  ema: "EMA",
  rsi: "RSI",
  macd: "MACD",
  stoch: "스토캐스틱",
  bb: "Bollinger Bands",
  mfi: "MFI",
  atr: "ATR",
  obv: "OBV",
  keltner: "켈트너",
  vwap: "VWAP",
  adx: "ADX",
  psar: "Parabolic SAR",
  cci: "CCI",
  supertrend: "슈퍼트렌드",
  ichimoku: "일목균형표",
};

interface Props {
  onChange: () => void;
  /** Evaluation warnings (e.g. not enough bars for SMA period). */
  runtimeWarnings?: string[];
  /** When set, only show the matching indicator editor(s). */
  section?: IndicatorConfigSectionId;
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

function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Commit on Enter / blur so typing mid-edit does not refresh the chart. */
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
  /** Return false to reject the edit and restore the previous value. */
  onChange: (v: number) => boolean | void;
  help?: HelpContent;
}) {
  const [draft, setDraft] = useState(() =>
    Number.isFinite(value) ? String(value) : "",
  );

  useEffect(() => {
    setDraft(Number.isFinite(value) ? String(value) : "");
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(Number.isFinite(value) ? String(value) : "");
      return;
    }
    const next = clampNum(n, min, max);
    if (next === value) {
      setDraft(String(value));
      return;
    }
    const accepted = onChange(next);
    if (accepted === false) {
      setDraft(Number.isFinite(value) ? String(value) : "");
      return;
    }
    setDraft(String(next));
  };

  return (
    <label className="block text-sm text-text-secondary">
      <LabelWithHelp label={label} help={help} />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 tabular-nums text-text-primary outline-none focus:border-accent"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
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
  onNotice,
}: {
  indicatorId: string;
  title: string;
  periods: number[];
  colors: Record<string, string>;
  min: number;
  max: number;
  maxCount?: number;
  onChange: () => void;
  onNotice: (message: string | null, kind?: "error" | "info") => void;
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
                  onNotice(null);
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
                const result = setIndicatorPeriodAt(indicatorId, i, v);
                if (!result.ok) {
                  onNotice(result.error, "error");
                  return false;
                }
                onNotice(
                  result.changed
                    ? `${title} Period가 ${v}(으)로 적용되었습니다. 사이드바 레이어가 켜집니다.`
                    : null,
                  "info",
                );
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
export function IndicatorConfigForm({
  onChange,
  runtimeWarnings = [],
  section = "all",
}: Props) {
  const cfg = getEffectiveIndicatorsConfig();
  const find = (id: string) => cfg.indicators.find((i) => i.id === id);
  const [notice, setNotice] = useState<{
    message: string;
    kind: "error" | "info";
  } | null>(null);

  const sma = find("sma");
  const ema = find("ema");
  const rsi = find("rsi");
  const macd = find("macd");
  const stoch = find("stoch");
  const bb = find("bb");
  const mfi = find("mfi");
  const atr = find("atr");
  const obv = find("obv");
  const keltner = find("keltner");
  const vwap = find("vwap");
  const adx = find("adx");
  const psar = find("psar");
  const cci = find("cci");
  const supertrend = find("supertrend");
  const ichimoku = find("ichimoku");

  if (
    !sma ||
    !ema ||
    !rsi ||
    !macd ||
    !stoch ||
    !bb ||
    !atr ||
    !obv ||
    !keltner ||
    !vwap ||
    !adx ||
    !psar ||
    !cci ||
    !supertrend
  ) {
    throw new ConfigError("IndicatorConfigForm: missing indicator definitions");
  }

  const smaPeriods = (sma.params.periods as number[]) ?? [20, 50, 200];
  const emaPeriods = (ema.params.periods as number[]) ?? [12, 26];
  const smaColors = parsePeriodColors(sma.params.colors);
  const emaColors = parsePeriodColors(ema.params.colors);

  const show = (id: IndicatorConfigSectionId) =>
    section === "all" ||
    section === id ||
    (section === "ma" && (id === "sma" || id === "ema"));

  const patch = () => onChange();
  const onNotice = (message: string | null, kind: "error" | "info" = "info") => {
    setNotice(message ? { message, kind } : null);
  };

  const indicatorWarnings = runtimeWarnings.filter(
    (w) =>
      /SMA|EMA|RSI|MACD|STOCH|BB|MFI|ATR|OBV|KELTNER|켈트너|VWAP|ADX|PSAR|SAR|CCI|슈퍼|SUPER|ICHIMOKU|일목|스토캐|sma|ema|rsi|macd|stoch|bb|mfi|atr|obv|keltner|vwap|adx|psar|cci|supertrend|ichimoku|점수 규칙/i.test(
        w,
      ) || w.includes("봉"),
  );

  // Drop transient notices once parent re-evaluated (warnings list refreshed).
  useEffect(() => {
    if (!notice) return;
    if (notice.kind === "info") {
      const t = window.setTimeout(() => setNotice(null), 2500);
      return () => window.clearTimeout(t);
    }
  }, [notice]);

  useEffect(() => {
    if (!notice || notice.kind !== "error") return;
    if (indicatorWarnings.length === 0) {
      setNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeWarnings.join("\n")]);

  return (
    <div className="space-y-3 text-left">
      <p className="text-xs text-text-tertiary">
        브라우저에 저장됩니다. 숫자 변경은 Enter 또는 포커스 아웃 시 반영됩니다.
        「?」를 누르면 지표·설정값 설명을 볼 수 있습니다.
      </p>

      {notice && (
        <div
          className={
            notice.kind === "error"
              ? "rounded-md border border-negative/40 bg-negative/10 px-3 py-2 text-xs text-negative"
              : "rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent"
          }
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      )}

      {indicatorWarnings.length > 0 && (
        <div
          className="rounded-md border border-negative/40 bg-negative/10 px-3 py-2 text-xs text-negative"
          role="alert"
        >
          <p className="font-semibold">차트/계산 오류</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-text-secondary">
            {indicatorWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {show("sma") && (
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
            onNotice={onNotice}
          />
        </IndicatorSection>
      )}

      {show("ema") && (
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
            onNotice={onNotice}
          />
        </IndicatorSection>
      )}

      {show("rsi") && (
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
      )}

      {show("macd") && (
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
      )}

      {show("stoch") && (
        <IndicatorSection
          title="스토캐스틱"
          help={INDICATOR_HELP.stoch}
          enabled={stoch.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("stoch", v);
            patch();
          }}
        >
          <NumInput
            label="Period"
            help={PARAM_HELP["stoch.period"]}
            value={requireNumber(stoch.params.period, "stoch.period")}
            min={3}
            max={50}
            onChange={(v) => {
              setIndicatorParam("stoch", "period", v);
              patch();
            }}
          />
          <NumInput
            label="Slowing"
            help={PARAM_HELP["stoch.slowing"]}
            value={requireNumber(stoch.params.slowing, "stoch.slowing")}
            min={1}
            max={10}
            onChange={(v) => {
              setIndicatorParam("stoch", "slowing", v);
              patch();
            }}
          />
          <NumInput
            label="Signal (%D)"
            help={PARAM_HELP["stoch.signalPeriod"]}
            value={requireNumber(
              stoch.params.signalPeriod,
              "stoch.signalPeriod",
            )}
            min={1}
            max={20}
            onChange={(v) => {
              setIndicatorParam("stoch", "signalPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="Overbought"
            help={INDICATOR_HELP.stoch}
            value={(stoch.overbought as number | undefined) ?? 80}
            min={50}
            max={95}
            onChange={(v) => {
              setIndicatorThreshold("stoch", "overbought", v);
              patch();
            }}
          />
          <NumInput
            label="Oversold"
            help={INDICATOR_HELP.stoch}
            value={(stoch.oversold as number | undefined) ?? 20}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorThreshold("stoch", "oversold", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("bb") && (
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
      )}

      {mfi && show("mfi") && (
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

      {show("atr") && (
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
      )}

      {show("obv") && (
        <IndicatorSection
          title="OBV"
          help={INDICATOR_HELP.obv}
          enabled={obv.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("obv", v);
            patch();
          }}
        >
          <p className="mb-2 text-xs text-text-tertiary">
            누적 균형 거래량. 시그널(EMA)·에너지(%)는 패스트 OBV 추력 전략에
            사용됩니다.
          </p>
          <NumInput
            label="Signal EMA"
            help={PARAM_HELP["obv.signalPeriod"]}
            value={requireNumber(
              obv.params.signalPeriod ?? 10,
              "obv.signalPeriod",
            )}
            min={3}
            max={50}
            onChange={(v) => {
              setIndicatorParam("obv", "signalPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="Energy lookback"
            help={PARAM_HELP["obv.energyLookback"]}
            value={requireNumber(
              obv.params.energyLookback ?? 8,
              "obv.energyLookback",
            )}
            min={3}
            max={30}
            onChange={(v) => {
              setIndicatorParam("obv", "energyLookback", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("keltner") && (
        <IndicatorSection
          title="켈트너 채널"
          help={INDICATOR_HELP.keltner}
          enabled={keltner.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("keltner", v);
            patch();
          }}
        >
          <NumInput
            label="EMA Period"
            help={PARAM_HELP["keltner.emaPeriod"]}
            value={requireNumber(
              keltner.params.emaPeriod ?? 20,
              "keltner.emaPeriod",
            )}
            min={5}
            max={100}
            onChange={(v) => {
              setIndicatorParam("keltner", "emaPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="ATR Period"
            help={PARAM_HELP["keltner.atrPeriod"]}
            value={requireNumber(
              keltner.params.atrPeriod ?? 10,
              "keltner.atrPeriod",
            )}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("keltner", "atrPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="Multiplier"
            help={PARAM_HELP["keltner.multiplier"]}
            value={requireNumber(
              keltner.params.multiplier ?? 2,
              "keltner.multiplier",
            )}
            min={1}
            max={5}
            step={0.5}
            onChange={(v) => {
              setIndicatorParam("keltner", "multiplier", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("vwap") && (
        <IndicatorSection
          title="VWAP"
          help={INDICATOR_HELP.vwap}
          enabled={vwap.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("vwap", v);
            patch();
          }}
        >
          <p className="mb-2 text-xs text-text-tertiary">
            창 누적 VWAP 중심선 + 표준편차 밴드(기본 ×2 / ×3). 거래량 전략의
            눌림목·밴드 반전·스위칭과 함께 씁니다.
          </p>
          <NumInput
            label="Band stdDev1"
            help={PARAM_HELP["vwap.stdDev1"]}
            value={requireNumber(vwap.params.stdDev1 ?? 2, "vwap.stdDev1")}
            min={0.5}
            max={5}
            step={0.5}
            onChange={(v) => {
              setIndicatorParam("vwap", "stdDev1", v);
              patch();
            }}
          />
          <NumInput
            label="Band stdDev2"
            help={PARAM_HELP["vwap.stdDev2"]}
            value={requireNumber(vwap.params.stdDev2 ?? 3, "vwap.stdDev2")}
            min={0.5}
            max={6}
            step={0.5}
            onChange={(v) => {
              setIndicatorParam("vwap", "stdDev2", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("adx") && (
        <IndicatorSection
          title="ADX"
          help={INDICATOR_HELP.adx}
          enabled={adx.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("adx", v);
            patch();
          }}
        >
          <NumInput
            label="Period"
            help={PARAM_HELP["adx.period"]}
            value={requireNumber(adx.params.period, "adx.period")}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("adx", "period", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("psar") && (
        <IndicatorSection
          title="Parabolic SAR"
          help={INDICATOR_HELP.psar}
          enabled={psar.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("psar", v);
            patch();
          }}
        >
          <NumInput
            label="Step"
            help={PARAM_HELP["psar.step"]}
            value={requireNumber(psar.params.step ?? 0.02, "psar.step")}
            min={0.01}
            max={0.2}
            step={0.01}
            onChange={(v) => {
              setIndicatorParam("psar", "step", v);
              patch();
            }}
          />
          <NumInput
            label="Max"
            help={PARAM_HELP["psar.max"]}
            value={requireNumber(psar.params.max ?? 0.2, "psar.max")}
            min={0.05}
            max={0.5}
            step={0.01}
            onChange={(v) => {
              setIndicatorParam("psar", "max", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("cci") && (
        <IndicatorSection
          title="CCI"
          help={INDICATOR_HELP.cci}
          enabled={cci.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("cci", v);
            patch();
          }}
        >
          <NumInput
            label="Period"
            help={PARAM_HELP["cci.period"]}
            value={requireNumber(cci.params.period, "cci.period")}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("cci", "period", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {show("supertrend") && (
        <IndicatorSection
          title="슈퍼트렌드"
          help={INDICATOR_HELP.supertrend}
          enabled={supertrend.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("supertrend", v);
            patch();
          }}
        >
          <NumInput
            label="ATR Period"
            help={PARAM_HELP["supertrend.atrPeriod"]}
            value={requireNumber(
              supertrend.params.atrPeriod ?? 10,
              "supertrend.atrPeriod",
            )}
            min={5}
            max={50}
            onChange={(v) => {
              setIndicatorParam("supertrend", "atrPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="Multiplier"
            help={PARAM_HELP["supertrend.multiplier"]}
            value={requireNumber(
              supertrend.params.multiplier ?? 3,
              "supertrend.multiplier",
            )}
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => {
              setIndicatorParam("supertrend", "multiplier", v);
              patch();
            }}
          />
        </IndicatorSection>
      )}

      {ichimoku && show("ichimoku") && (
        <IndicatorSection
          title="일목균형표"
          help={INDICATOR_HELP.ichimoku}
          enabled={ichimoku.enabled}
          onEnabledChange={(v) => {
            setIndicatorEnabled("ichimoku", v);
            patch();
          }}
        >
          <NumInput
            label="전환선 (Tenkan)"
            help={PARAM_HELP["ichimoku.conversionPeriod"]}
            value={requireNumber(
              ichimoku.params.conversionPeriod,
              "ichimoku.conversionPeriod",
            )}
            min={2}
            max={50}
            onChange={(v) => {
              setIndicatorParam("ichimoku", "conversionPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="기준선 (Kijun)"
            help={PARAM_HELP["ichimoku.basePeriod"]}
            value={requireNumber(
              ichimoku.params.basePeriod,
              "ichimoku.basePeriod",
            )}
            min={2}
            max={100}
            onChange={(v) => {
              setIndicatorParam("ichimoku", "basePeriod", v);
              patch();
            }}
          />
          <NumInput
            label="선행스팬2 기간"
            help={PARAM_HELP["ichimoku.spanPeriod"]}
            value={requireNumber(
              ichimoku.params.spanPeriod,
              "ichimoku.spanPeriod",
            )}
            min={10}
            max={120}
            onChange={(v) => {
              setIndicatorParam("ichimoku", "spanPeriod", v);
              patch();
            }}
          />
          <NumInput
            label="이동 (Displacement)"
            help={PARAM_HELP["ichimoku.displacement"]}
            value={requireNumber(
              ichimoku.params.displacement,
              "ichimoku.displacement",
            )}
            min={1}
            max={60}
            onChange={(v) => {
              setIndicatorParam("ichimoku", "displacement", v);
              patch();
            }}
          />
          <div className="space-y-3 pt-1">
            {ICHIMOKU_LINE_ORDER.map((part) => {
              const colors = parsePeriodColors(ichimoku.params.colors);
              const color = resolveIchimokuColor(colors, part);
              return (
                <div key={part}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                    <span>{ICHIMOKU_PART_META[part].labelKo} 색상</span>
                    <HelpTip help={PARAM_HELP["ichimoku.color"]} />
                  </p>
                  <ColorSwatchPicker
                    value={color}
                    onChange={(c) => {
                      setIndicatorNamedColor("ichimoku", part, c);
                      patch();
                    }}
                  />
                </div>
              );
            })}
          </div>
        </IndicatorSection>
      )}

      {section === "all" && (
        <Button
          variant="secondary"
          onClick={() => {
            resetOverrides();
            patch();
          }}
        >
          기본값으로 초기화
        </Button>
      )}
    </div>
  );
}
