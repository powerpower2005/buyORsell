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

  const atrCfg = getIndicatorConfig("atr");
  const atrPeriod = (atrCfg?.params.period as number | undefined) ?? 14;
  const atr = results.indicators.atr?.latest.atr;
  if (atr != null) {
    metrics.push({ label: `ATR(${atrPeriod})`, value: fmt(atr) });
  } else if (atrCfg?.enabled) {
    metrics.push({ label: `ATR(${atrPeriod})`, value: "데이터 부족", muted: true });
  }

  const obvCfg = getIndicatorConfig("obv");
  const obvL = results.indicators.obv?.latest;
  if (obvL?.obv != null) {
    const slope =
      obvL.slope == null
        ? ""
        : obvL.slope > 0
          ? " ↑"
          : obvL.slope < 0
            ? " ↓"
            : "";
    const energy =
      obvL.energy != null ? ` · E${fmt(obvL.energy, 0)}%` : "";
    metrics.push({
      label: "OBV",
      value: `${fmt(obvL.obv, 0)}${slope}${energy}`,
      color: "#38bdf8",
    });
  } else if (obvCfg?.enabled) {
    metrics.push({ label: "OBV", value: "데이터 부족", muted: true });
  }

  const kcCfg = getIndicatorConfig("keltner");
  const kc = results.indicators.keltner?.latest;
  if (kc?.mid != null) {
    metrics.push({
      label: "Keltner",
      value: `${fmt(kc.lower)} / ${fmt(kc.mid)} / ${fmt(kc.upper)}`,
      color: "#06b6d4",
    });
  } else if (kcCfg?.enabled) {
    metrics.push({ label: "Keltner", value: "데이터 부족", muted: true });
  }

  const vwapCfg = getIndicatorConfig("vwap");
  const vwapL = results.indicators.vwap?.latest;
  if (vwapL?.vwap != null) {
    const slope =
      vwapL.slope == null
        ? ""
        : vwapL.slope > 0
          ? " ↑"
          : vwapL.slope < 0
            ? " ↓"
            : " →";
    metrics.push({
      label: "VWAP",
      value: `${fmt(vwapL.vwap)}${slope}`,
      color: "#3b82f6",
    });
    if (vwapL.upper1 != null && vwapL.lower1 != null) {
      metrics.push({
        label: "VWAP ±σ1",
        value: `${fmt(vwapL.lower1)} ~ ${fmt(vwapL.upper1)}`,
        color: "#f97316",
      });
    }
  } else if (vwapCfg?.enabled) {
    metrics.push({ label: "VWAP", value: "데이터 부족", muted: true });
  }

  const adxCfg = getIndicatorConfig("adx");
  const adxPeriod = (adxCfg?.params.period as number | undefined) ?? 14;
  const adx = results.indicators.adx?.latest;
  if (adx?.adx != null) {
    metrics.push({
      label: `ADX(${adxPeriod})`,
      value: `${fmt(adx.adx)} · +${fmt(adx.plusDI)}/−${fmt(adx.minusDI)}`,
    });
  } else if (adxCfg?.enabled) {
    metrics.push({
      label: `ADX(${adxPeriod})`,
      value: "데이터 부족",
      muted: true,
    });
  }

  const psarCfg = getIndicatorConfig("psar");
  const psar = results.indicators.psar?.latest;
  if (psar?.psar != null) {
    metrics.push({
      label: "PSAR",
      value: `${fmt(psar.psar)} · ${psar.direction != null && psar.direction > 0 ? "↑" : "↓"}`,
    });
  } else if (psarCfg?.enabled) {
    metrics.push({ label: "PSAR", value: "데이터 부족", muted: true });
  }

  const cciCfg = getIndicatorConfig("cci");
  const cciPeriod = (cciCfg?.params.period as number | undefined) ?? 20;
  const cci = results.indicators.cci?.latest.cci;
  if (cci != null) {
    metrics.push({ label: `CCI(${cciPeriod})`, value: fmt(cci) });
  } else if (cciCfg?.enabled) {
    metrics.push({ label: `CCI(${cciPeriod})`, value: "데이터 부족", muted: true });
  }

  const stCfg = getIndicatorConfig("supertrend");
  const st = results.indicators.supertrend?.latest;
  if (st?.supertrend != null) {
    metrics.push({
      label: "Supertrend",
      value: `${fmt(st.supertrend)} · ${st.direction != null && st.direction > 0 ? "↑" : "↓"}`,
      color: st.direction != null && st.direction > 0 ? "#00c471" : "#f04452",
    });
  } else if (stCfg?.enabled) {
    metrics.push({ label: "Supertrend", value: "데이터 부족", muted: true });
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
