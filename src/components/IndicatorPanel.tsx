import { Card, SectionTitle } from "./ui/Card";
import type { IndicatorResults } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { getIndicatorConfig } from "@/lib/configStore";
import { parsePeriodColors, resolvePeriodColor } from "@/lib/indicatorColors";

function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function IndicatorPanel({ results }: { results: IndicatorResults }) {
  const rsiCfg = getIndicatorConfig("rsi");
  const smaCfg = getIndicatorConfig("sma");
  const rsiPeriod = (rsiCfg?.params.period as number | undefined) ?? 14;
  const smaPeriods = ((smaCfg?.params.periods as number[] | undefined) ?? [50, 200])
    .slice()
    .sort((a, b) => a - b);
  const smaColors = parsePeriodColors(smaCfg?.params.colors);

  const metrics: { label: string; value: string; color?: string }[] = [];

  const rsi = results.indicators.rsi?.latest.rsi;
  if (rsi != null) {
    metrics.push({ label: `RSI(${rsiPeriod})`, value: fmt(rsi) });
  }

  const macdHist = results.indicators.macd?.latest.macdHist;
  if (macdHist != null) {
    metrics.push({ label: "MACD Hist", value: fmt(macdHist, 4) });
  }

  for (const period of smaPeriods) {
    const key = `sma:${period}`;
    const val = results.indicators.sma?.latest[key];
    if (val != null) {
      const idx = ((smaCfg?.params.periods as number[] | undefined) ?? []).indexOf(period);
      metrics.push({
        label: `SMA ${period}`,
        value: fmt(val),
        color: resolvePeriodColor(smaColors, period, Math.max(0, idx)),
      });
    }
  }

  const bbMid = results.indicators.bb?.latest.bbMiddle;
  if (bbMid != null) {
    metrics.push({ label: "BB Middle", value: fmt(bbMid) });
  }

  const atr = results.indicators.atr?.latest.atr;
  if (atr != null) {
    metrics.push({ label: "ATR", value: fmt(atr) });
  }

  return (
    <Card>
      <SectionTitle>기술 지표</SectionTitle>
      {!metrics.length ? (
        <p className="text-sm text-text-tertiary">계산된 지표가 없습니다.</p>
      ) : (
        <div className="grid gap-3 text-left sm:grid-cols-2">
          {metrics.map((m) => (
            <Metric key={m.label} label={m.label} value={m.value} color={m.color} />
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
}: {
  label: string;
  value: string;
  color?: string;
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
      <p className="tabular-nums text-lg font-medium">{value}</p>
    </div>
  );
}
