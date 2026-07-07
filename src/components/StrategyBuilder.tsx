import { useState } from "react";
import { Card, SectionTitle } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { DEFAULT_STRATEGY, runBacktest } from "@/lib/evaluation/backtest";
import type { OHLCVBar, BacktestResult } from "@/lib/types";

interface Props {
  bars: OHLCVBar[];
  onResult: (r: BacktestResult) => void;
}

export function StrategyBuilder({ bars, onResult }: Props) {
  const [entry, setEntry] = useState(DEFAULT_STRATEGY.entry);
  const [exit, setExit] = useState(DEFAULT_STRATEGY.exit);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const run = () => {
    const r = runBacktest(bars, {
      entry,
      exit,
      stop_loss_pct: DEFAULT_STRATEGY.stop_loss_pct,
      take_profit_pct: DEFAULT_STRATEGY.take_profit_pct,
    });
    setResult(r);
    onResult(r);
  };

  return (
    <Card>
      <SectionTitle>전략 백테스트</SectionTitle>
      <div className="space-y-3 text-left">
        <label className="block text-xs text-text-secondary">
          Entry
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} className="mt-1" />
        </label>
        <label className="block text-xs text-text-secondary">
          Exit
          <Input value={exit} onChange={(e) => setExit(e.target.value)} className="mt-1" />
        </label>
        <Button variant="secondary" onClick={run}>
          백테스트 실행
        </Button>
        {result && (
          <div className="text-sm text-text-secondary">
            <p className="tabular-nums">Total return: {result.totalReturnPct}%</p>
            <p className="tabular-nums">Max DD: {result.maxDrawdownPct}%</p>
            <p className="tabular-nums">Win rate: {result.winRate}% ({result.tradeCount} trades)</p>
          </div>
        )}
      </div>
    </Card>
  );
}
