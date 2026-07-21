import { useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { DEFAULT_STRATEGY, runBacktest } from "@/lib/evaluation/backtest";
import {
  runPlaybookBacktest,
  type PlaybookEntrySignal,
} from "@/lib/evaluation/playbookBacktest";
import {
  STRATEGY_CATALOG,
  STRATEGY_FAMILY_META,
  strategiesByFamily,
  type StrategyFamilyId,
} from "@/lib/strategyCatalog";
import type { BacktestResult, OHLCVBar } from "@/lib/types";

/** Minimal evaluation shape for collecting playbook hits. */
type HitBag = {
  recent?: PlaybookEntrySignal[];
  signals?: PlaybookEntrySignal[];
};

export type PlaybookSource = {
  bbStrategies?: HitBag | null;
  ichimokuStrategies?: HitBag | null;
  volumeStrategies?: HitBag | null;
  rsiStrategies?: HitBag | null;
  macdStrategies?: HitBag | null;
  stochStrategies?: HitBag | null;
  patternStrategies?: HitBag | null;
};

interface Props {
  bars: OHLCVBar[];
  evaluation?: PlaybookSource | null;
  onResult: (r: BacktestResult) => void;
}

type Mode = "formula" | "playbook";

function collectSelectedSignals(
  evaluation: PlaybookSource | null | undefined,
  selected: Set<string>,
): PlaybookEntrySignal[] {
  if (!evaluation || selected.size === 0) return [];
  const buckets: Array<{
    family: StrategyFamilyId;
    bag?: HitBag | null;
  }> = [
    { family: "bb", bag: evaluation.bbStrategies },
    { family: "ichimoku", bag: evaluation.ichimokuStrategies },
    { family: "volume", bag: evaluation.volumeStrategies },
    { family: "rsi", bag: evaluation.rsiStrategies },
    { family: "macd", bag: evaluation.macdStrategies },
    { family: "stoch", bag: evaluation.stochStrategies },
    { family: "pattern", bag: evaluation.patternStrategies },
  ];

  const out: PlaybookEntrySignal[] = [];
  for (const { family, bag } of buckets) {
    const list = bag?.signals ?? bag?.recent;
    if (!list) continue;
    for (const h of list) {
      const key = `${family}:${h.id}`;
      if (!selected.has(key)) continue;
      out.push({
        barIndex: h.barIndex,
        date: h.date,
        direction: h.direction,
        id: h.id,
        label: h.label,
      });
    }
  }
  return out;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-md bg-surface-elevated/60 px-2.5 py-2">
      <p className="text-[10px] text-text-tertiary">{label}</p>
      <p className="mt-0.5 text-sm tabular-nums text-text-primary">
        {value == null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

export function StrategyBuilder({ bars, evaluation, onResult }: Props) {
  const [mode, setMode] = useState<Mode>("playbook");
  const [entry, setEntry] = useState(DEFAULT_STRATEGY.entry);
  const [exit, setExit] = useState(DEFAULT_STRATEGY.exit);
  const [stopPct, setStopPct] = useState(String(DEFAULT_STRATEGY.stop_loss_pct));
  const [takePct, setTakePct] = useState(
    String(DEFAULT_STRATEGY.take_profit_pct),
  );
  const [horizon, setHorizon] = useState("12");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<BacktestResult | null>(null);

  const groups = useMemo(() => strategiesByFamily(STRATEGY_CATALOG), []);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const run = () => {
    let r: BacktestResult;
    if (mode === "formula") {
      r = runBacktest(bars, {
        entry,
        exit,
        stop_loss_pct: Number(stopPct) || 0,
        take_profit_pct: Number(takePct) || 0,
      });
    } else {
      const signals = collectSelectedSignals(evaluation, selected);
      r = runPlaybookBacktest(bars, signals, {
        horizon: Number(horizon) || 12,
        stopLossPct: Number(stopPct) || 1.5,
        takeProfitPct: Number(takePct) || 1.5,
      });
    }
    setResult(r);
    onResult(r);
  };

  return (
    <Card>
      <SectionTitle>전략 백테스트</SectionTitle>
      <div className="space-y-3 text-left">
        <div className="flex gap-2">
          {(
            [
              ["playbook", "사이드바 전략"],
              ["formula", "수식"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={
                mode === id
                  ? "rounded-md bg-accent px-3 py-1.5 text-xs text-white"
                  : "rounded-md bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "formula" ? (
          <>
            <label className="block text-xs text-text-secondary">
              Entry
              <Input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs text-text-secondary">
              Exit
              <Input
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                className="mt-1"
              />
            </label>
          </>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {groups.map(({ family, entries }) => (
              <div key={family}>
                <p className="mb-1 text-[10px] font-medium text-text-tertiary">
                  {STRATEGY_FAMILY_META[family].labelKo}
                </p>
                <div className="flex flex-wrap gap-1">
                  {entries.map((e) => {
                    const key = `${e.family}:${e.id}`;
                    const on = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className={
                          on
                            ? "rounded bg-accent/20 px-2 py-0.5 text-[10px] text-accent"
                            : "rounded bg-surface-elevated px-2 py-0.5 text-[10px] text-text-tertiary"
                        }
                      >
                        {e.labelKo}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {selected.size === 0 && (
              <p className="text-[10px] text-text-tertiary">
                백테스트할 전략을 하나 이상 고르세요. (이 종목 전 구간 시그널)
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-text-secondary">
            손절 %
            <Input
              value={stopPct}
              onChange={(e) => setStopPct(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-xs text-text-secondary">
            익절 %
            <Input
              value={takePct}
              onChange={(e) => setTakePct(e.target.value)}
              className="mt-1"
            />
          </label>
          {mode === "playbook" && (
            <label className="block text-xs text-text-secondary">
              보유 봉수
              <Input
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="mt-1"
              />
            </label>
          )}
        </div>

        <Button variant="secondary" onClick={run}>
          백테스트 실행
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="총수익" value={`${result.totalReturnPct}%`} />
              <Metric label="최대낙폭" value={`${result.maxDrawdownPct}%`} />
              <Metric
                label="승률"
                value={`${result.winRate}% (${result.tradeCount}건)`}
              />
              <Metric label="평균수익" value={`${result.avgReturnPct ?? "—"}%`} />
              <Metric label="평균익절" value={`${result.avgWinPct ?? "—"}%`} />
              <Metric label="평균손절" value={`${result.avgLossPct ?? "—"}%`} />
              <Metric
                label="손익비"
                value={
                  result.profitFactor == null
                    ? "∞"
                    : result.profitFactor
                }
              />
              <Metric
                label="기대값"
                value={`${result.expectancyPct ?? "—"}%`}
              />
              <Metric
                label="승/패"
                value={`${result.winCount ?? "—"} / ${result.lossCount ?? "—"}`}
              />
              <Metric
                label="롱/숏"
                value={`${result.longCount ?? 0} / ${result.shortCount ?? 0}`}
              />
            </div>
            {result.trades.length > 0 && (
              <div className="max-h-40 overflow-y-auto text-[11px] text-text-tertiary">
                {result.trades.slice(0, 40).map((t, i) => (
                  <p key={i} className="tabular-nums">
                    {t.entryDate}→{t.exitDate}{" "}
                    {t.side ?? "long"} {t.returnPct}%
                    {t.strategyLabel ? ` · ${t.strategyLabel}` : ""}
                  </p>
                ))}
                {result.trades.length > 40 && (
                  <p>…외 {result.trades.length - 40}건</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
