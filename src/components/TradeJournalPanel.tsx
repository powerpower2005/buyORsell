import { useMemo, useState } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  STRATEGY_CATALOG,
  STRATEGY_FAMILY_META,
} from "@/lib/strategyCatalog";
import {
  addJournalEntry,
  listJournalEntries,
  removeJournalEntry,
  type TradeJournalEntry,
  type TradeJournalSide,
} from "@/lib/tradeJournalStore";
import type { OHLCVBar } from "@/lib/types";

interface Props {
  ticker: string;
  timeframe: string;
  bars: OHLCVBar[];
  /** Bump parent chart when journal changes. */
  onChange: () => void;
  refreshTick?: number;
}

function nearestBar(bars: OHLCVBar[], date: string): OHLCVBar | null {
  if (!bars.length || !date) return null;
  const exact = bars.find((b) => b.date === date);
  if (exact) return exact;
  let best: OHLCVBar | null = null;
  let bestDiff = Infinity;
  const t = Date.parse(date);
  if (!Number.isFinite(t)) return null;
  for (const b of bars) {
    const d = Math.abs(Date.parse(b.date) - t);
    if (d < bestDiff) {
      bestDiff = d;
      best = b;
    }
  }
  return best;
}

export function TradeJournalPanel({
  ticker,
  timeframe,
  bars,
  onChange,
  refreshTick = 0,
}: Props) {
  const entries = useMemo(
    () => listJournalEntries(ticker, timeframe),
    [ticker, timeframe, refreshTick],
  );

  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [side, setSide] = useState<TradeJournalSide>("buy");
  const [note, setNote] = useState("");
  const [strategies, setStrategies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleStrategy = (key: string) => {
    setStrategies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const submit = () => {
    setError(null);
    const bar = nearestBar(bars, date.trim());
    if (!bar) {
      setError("날짜에 맞는 봉을 찾지 못했습니다.");
      return;
    }
    const px = Number(price);
    if (!Number.isFinite(px) || px <= 0) {
      setError("가격을 입력하세요.");
      return;
    }
    addJournalEntry({
      ticker,
      timeframe,
      date: bar.date,
      price: px,
      side,
      note,
      strategies,
    });
    setNote("");
    setPrice("");
    onChange();
  };

  const strategyLabel = (key: string) => {
    const [family, id] = key.split(":");
    const entry = STRATEGY_CATALOG.find(
      (e) => e.family === family && e.id === id,
    );
    if (!entry) return key;
    return `${STRATEGY_FAMILY_META[entry.family].labelKo} · ${entry.labelKo}`;
  };

  return (
    <Card className="space-y-4">
      <SectionTitle>매매 기록</SectionTitle>
      <p className="text-xs text-text-tertiary">
        날짜·가격·사유를 직접 입력하면 차트에 매수/매도 마커로 표시됩니다. 여러
        건을 쌓아 복기할 수 있습니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-text-secondary">
          날짜
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block text-xs text-text-secondary">
          가격
          <Input
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
            placeholder="진입/청산가"
          />
        </label>
      </div>

      <div className="flex gap-2">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={
              side === s
                ? "rounded-md bg-accent px-3 py-1.5 text-xs text-white"
                : "rounded-md bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary"
            }
            onClick={() => setSide(s)}
          >
            {s === "buy" ? "매수" : "매도"}
          </button>
        ))}
      </div>

      <label className="block text-xs text-text-secondary">
        사유 / 메모
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1"
          placeholder="왜 이 자리에서 샀/팔았는지"
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs text-text-secondary">참고한 전략 (선택)</p>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
          {STRATEGY_CATALOG.map((e) => {
            const key = `${e.family}:${e.id}`;
            const on = strategies.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStrategy(key)}
                className={
                  on
                    ? "rounded-md bg-accent/20 px-2 py-0.5 text-[10px] text-accent"
                    : "rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] text-text-tertiary hover:text-text-secondary"
                }
              >
                {e.labelKo}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs text-negative">{error}</p>}

      <Button variant="secondary" onClick={submit}>
        기록 추가
      </Button>

      {entries.length > 0 && (
        <ul className="space-y-2 border-t border-border pt-3">
          {entries.map((e: TradeJournalEntry) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <p className="text-text-primary">
                  <span
                    className={
                      e.side === "buy" ? "text-positive" : "text-negative"
                    }
                  >
                    {e.side === "buy" ? "매수" : "매도"}
                  </span>{" "}
                  {e.date} · {e.price}
                </p>
                {e.note && (
                  <p className="mt-0.5 text-text-tertiary">{e.note}</p>
                )}
                {e.strategies.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-text-tertiary">
                    {e.strategies.map(strategyLabel).join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-text-tertiary hover:text-negative"
                onClick={() => {
                  removeJournalEntry(e.id);
                  onChange();
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
