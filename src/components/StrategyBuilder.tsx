import { EXECUTION_VERSION } from "@/lib/versions";
import { useEffect, useMemo, useState } from "react";
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
import type { IndicatorsConfig } from "@/lib/evaluation/types";
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
  comboStrategies?: HitBag | null;
  classicStrategies?: HitBag | null;
  provenance?: Record<string, unknown>;
};

interface Props {
  bars: OHLCVBar[];
  evaluation?: PlaybookSource | null;
  onResult: (r: BacktestResult | undefined) => void;
}

type Mode = "formula" | "playbook";

export function collectSelectedSignals(
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
    { family: "combo", bag: evaluation.comboStrategies },
    { family: "classic", bag: evaluation.classicStrategies },
  ];

  const out: PlaybookEntrySignal[] = [];
  for (const { family, bag } of buckets) {
    const list = bag?.signals ?? bag?.recent;
    if (!list) continue;
    for (const h of list) {
      const key = `${family}:${h.id}`;
      if (!selected.has(key) || h.id === "fake_breakout") continue;
      out.push({
        ...h,
        id: key,
        barIndex: h.barIndex,
        date: h.date,
        direction: h.direction,
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
  const [stopPct, setStopPct] = useState(
    String(DEFAULT_STRATEGY.stop_loss_pct),
  );
  const [takePct, setTakePct] = useState(
    String(DEFAULT_STRATEGY.take_profit_pct),
  );
  const [feeBps, setFeeBps] = useState("0");
  const [slippageBps, setSlippageBps] = useState("0");
  const [borrowApr, setBorrowApr] = useState("0");
  const [error, setError] = useState("");
  const [horizon, setHorizon] = useState("12");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<BacktestResult | null>(null);

  useEffect(() => {
    setResult(null);
    setError("");
    onResult(undefined);
  }, [
    bars,
    evaluation,
    mode,
    entry,
    exit,
    stopPct,
    takePct,
    horizon,
    selected,
    feeBps,
    slippageBps,
    borrowApr,
    onResult,
  ]);

  const groups = useMemo(
    () =>
      strategiesByFamily(
        STRATEGY_CATALOG.filter((entry) => entry.id !== "fake_breakout"),
      ),
    [],
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const run = () => {
    try {
      setError("");
      let r: BacktestResult;
      if (mode === "formula") {
        r = runBacktest(bars, {
          entry,
          exit,
          rsiPeriod: Number(
            (
              evaluation?.provenance?.indicatorConfig as
                | IndicatorsConfig
                | undefined
            )?.indicators.find((item) => item.id === "rsi")?.params.period ??
              14,
          ),
          horizon: Number(horizon),
          feeBps: Number(feeBps),
          slippageBps: Number(slippageBps),
          stop_loss_pct: Number(stopPct),
          take_profit_pct: Number(takePct),
        });
      } else {
        const signals = collectSelectedSignals(evaluation, selected);
        r = runPlaybookBacktest(bars, signals, {
          feeBps: Number(feeBps),
          slippageBps: Number(slippageBps),
          shortBorrowAprPct: Number(borrowApr),
          horizon: Number(horizon),
          stopLossPct: Number(stopPct),
          takeProfitPct: Number(takePct),
        });
      }
      r.assumptions = { ...r.assumptions, analysis: evaluation?.provenance };
      setResult(r);
      onResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card>
      <SectionTitle>전략 백테스트 · v{EXECUTION_VERSION}</SectionTitle>
      <p className="text-xs text-text-secondary">
        확정 다음 봉 시가 진입 · OHLC 손절/목표 · 동시 접촉 시 손절 우선 ·
        미종결 거래 별도 집계. 패턴은 자체 가격, 일반 전략은 아래 %를
        사용합니다.
      </p>
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
            <p className="text-xs text-text-secondary">
              RSI는 현재 지표 설정 기간의 Wilder 계산을 사용합니다.
              SMA50·SMA200과 AND·OR 조건을 지원하며 AND를 먼저 계산합니다.
            </p>
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
          {
            <label className="block text-xs text-text-secondary">
              보유 봉수
              <Input
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="mt-1"
              />
            </label>
          }
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            편도 수수료 bp
            <Input value={feeBps} onChange={(e) => setFeeBps(e.target.value)} />
          </label>
          <label>
            편도 슬리피지 bp
            <Input
              value={slippageBps}
              onChange={(e) => setSlippageBps(e.target.value)}
            />
          </label>
          <label>
            숏 연 대차료 %
            <Input
              value={borrowApr}
              onChange={(e) => setBorrowApr(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-text-secondary">
          0bp는 비용 0 가정입니다. 일반 신호 통계의 기본 조건은 12봉·±1.5%·비용
          0입니다.
        </p>
        {error && <p role="alert">{error}</p>}
        <Button
          variant="secondary"
          onClick={run}
          disabled={mode === "playbook" && selected.size === 0}
        >
          백테스트 실행
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="미종결" value={result.pendingCount ?? 0} />
              <Metric label="본전" value={result.breakevenCount ?? 0} />
              <Metric
                label="완료 거래 총수익"
                value={`${result.totalReturnPct}%`}
              />
              <Metric
                label="종가 평가 최대낙폭"
                value={`${result.maxDrawdownPct}%`}
              />
              <Metric
                label="승률"
                value={`${result.winRate}% (${result.tradeCount}건)`}
              />
              <Metric
                label="평균수익"
                value={`${result.avgReturnPct ?? "—"}%`}
              />
              <Metric label="평균 이익" value={`${result.avgWinPct ?? "—"}%`} />
              <Metric
                label="평균 손실"
                value={`${result.avgLossPct ?? "—"}%`}
              />
              <Metric
                label="Profit Factor"
                value={result.profitFactor == null ? "∞" : result.profitFactor}
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
                    {t.entryDate}→{t.exitDate} {t.side ?? "long"} {t.returnPct.toFixed(2)}%
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
