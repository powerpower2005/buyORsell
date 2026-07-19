import { Card, SectionTitle } from "./ui/Card";
import type { IndicatorResults } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { getIndicatorConfig } from "@/lib/configStore";
import {
  BB_BAND_META,
  BB_BAND_ORDER,
  resolveBbBandColor,
} from "@/lib/bbOverlay";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";

function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function IndicatorPanel({ results }: { results: IndicatorResults }) {
  const rsiCfg = getIndicatorConfig("rsi");
  const smaCfg = getIndicatorConfig("sma");
  const emaCfg = getIndicatorConfig("ema");
  const bbCfg = getIndicatorConfig("bb");
  const rsiPeriod = (rsiCfg?.params.period as number | undefined) ?? 14;
  const smaPeriods = ((smaCfg?.params.periods as number[] | undefined) ?? [50, 200])
    .slice()
    .sort((a, b) => a - b);
  const emaPeriods = ((emaCfg?.params.periods as number[] | undefined) ?? [12, 26])
    .slice()
    .sort((a, b) => a - b);
  const smaColors = parsePeriodColors(smaCfg?.params.colors);
  const emaColors = parsePeriodColors(emaCfg?.params.colors);

  const metrics: { label: string; value: string; color?: string; muted?: boolean }[] = [];

  const rsi = results.indicators.rsi?.latest.rsi;
  if (rsi != null) {
    metrics.push({ label: `RSI(${rsiPeriod})`, value: fmt(rsi) });
  } else if (rsiCfg?.enabled) {
    metrics.push({ label: `RSI(${rsiPeriod})`, value: "데이터 부족", muted: true });
  }

  const macdHist = results.indicators.macd?.latest.macdHist;
  if (macdHist != null) {
    metrics.push({ label: "MACD Hist", value: fmt(macdHist, 4) });
  } else if (getIndicatorConfig("macd")?.enabled) {
    metrics.push({ label: "MACD Hist", value: "데이터 부족", muted: true });
  }

  const stochCfg = getIndicatorConfig("stoch");
  const stochK = results.indicators.stoch?.latest.stochK;
  const stochD = results.indicators.stoch?.latest.stochD;
  if (stochK != null && stochD != null) {
    metrics.push({
      label: "Stoch K/D",
      value: `${fmt(stochK)} / ${fmt(stochD)}`,
    });
  } else if (stochCfg?.enabled) {
    metrics.push({ label: "Stoch K/D", value: "데이터 부족", muted: true });
  }

  for (const period of smaPeriods) {
    const key = `sma:${period}`;
    const val = results.indicators.sma?.latest[key];
    const idx = ((smaCfg?.params.periods as number[] | undefined) ?? []).indexOf(period);
    if (val != null) {
      metrics.push({
        label: `SMA ${period}`,
        value: fmt(val),
        color: resolvePeriodColor(smaColors, period, Math.max(0, idx)),
      });
    } else if (smaCfg?.enabled) {
      metrics.push({
        label: `SMA ${period}`,
        value: "데이터 부족",
        muted: true,
        color: resolvePeriodColor(smaColors, period, Math.max(0, idx)),
      });
    }
  }

  for (const period of emaPeriods) {
    const key = `ema:${period}`;
    const val = results.indicators.ema?.latest[key];
    const idx = ((emaCfg?.params.periods as number[] | undefined) ?? []).indexOf(period);
    if (val != null) {
      metrics.push({
        label: `EMA ${period}`,
        value: fmt(val),
        color: resolvePeriodColor(emaColors, period, Math.max(0, idx)),
      });
    } else if (emaCfg?.enabled) {
      metrics.push({
        label: `EMA ${period}`,
        value: "데이터 부족",
        muted: true,
        color: resolvePeriodColor(emaColors, period, Math.max(0, idx)),
      });
    }
  }

  const bbColors = parsePeriodColors(bbCfg?.params.colors);
  for (const band of BB_BAND_ORDER) {
    const seriesKey = BB_BAND_META[band].seriesKey;
    const val = results.indicators.bb?.latest[seriesKey];
    const label = `BB ${BB_BAND_META[band].labelKo}`;
    const color = resolveBbBandColor(bbColors, band);
    if (val != null) {
      metrics.push({ label, value: fmt(val), color });
    } else if (bbCfg?.enabled) {
      metrics.push({ label, value: "데이터 부족", muted: true, color });
    }
  }

  const bbPct = results.indicators.bb?.latest.bbPercentB;
  if (bbPct != null) {
    metrics.push({ label: "%B", value: fmt(bbPct, 3) });
  } else if (bbCfg?.enabled) {
    metrics.push({ label: "%B", value: "데이터 부족", muted: true });
  }

  const mfiCfg = getIndicatorConfig("mfi");
  const mfiPeriod = (mfiCfg?.params.period as number | undefined) ?? 14;
  const mfi = results.indicators.mfi?.latest.mfi;
  if (mfi != null) {
    metrics.push({ label: `MFI(${mfiPeriod})`, value: fmt(mfi) });
  } else if (mfiCfg?.enabled) {
    metrics.push({ label: `MFI(${mfiPeriod})`, value: "데이터 부족", muted: true });
  }

  const atr = results.indicators.atr?.latest.atr;
  if (atr != null) {
    metrics.push({ label: "ATR", value: fmt(atr) });
  } else if (getIndicatorConfig("atr")?.enabled) {
    metrics.push({ label: "ATR", value: "데이터 부족", muted: true });
  }

  const ichiCfg = getIndicatorConfig("ichimoku");
  const ichi = results.indicators.ichimoku?.latest;
  if (ichi?.tenkan != null && ichi.kijun != null) {
    metrics.push({
      label: "일목 T/K",
      value: `${fmt(ichi.tenkan)} / ${fmt(ichi.kijun)}`,
    });
  } else if (ichiCfg?.enabled) {
    metrics.push({ label: "일목 T/K", value: "데이터 부족", muted: true });
  }

  return (
    <Card>
      <SectionTitle>기술 지표</SectionTitle>
      {!metrics.length ? (
        <p className="text-sm text-text-tertiary">계산된 지표가 없습니다.</p>
      ) : (
        <div className="grid gap-3 text-left sm:grid-cols-2">
          {metrics.map((m) => (
            <Metric key={m.label} label={m.label} value={m.value} color={m.color} muted={m.muted} />
          ))}
        </div>
      )}
      {results.signals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {results.signals.map((s) => (
            <Badge key={s.id} variant={s.active ? "positive" : "muted"}>
              {s.id}: {s.active ? s.direction : "inactive"}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        {color ? (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </p>
      <p
        className={`tabular-nums text-lg font-medium ${muted ? "text-text-tertiary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
