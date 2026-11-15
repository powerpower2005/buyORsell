import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { simulateTrade } from "../src/lib/evaluation/execution";
import {
  runBacktest,
  summarizeBacktestTrades,
} from "../src/lib/evaluation/backtest";
import { runPlaybookBacktest } from "../src/lib/evaluation/playbookBacktest";
import { scoreSignalHits } from "../src/lib/evaluation/signalFollowThrough";
import {
  closedBars,
  recordConfirmedHits,
} from "../src/lib/evaluation/confirmedSignals";
import { evaluateQuote } from "../src/lib/evaluation/evaluateQuote";
import { detectChartPatterns } from "../src/lib/evaluation/chartPatterns";
import { collectSelectedSignals } from "../src/components/StrategyBuilder";
import { STRATEGY_CATALOG } from "../src/lib/strategyCatalog";
import { CANDLE_PATTERN_ORDER } from "../src/lib/candlePatternMeta";
import { CHART_PATTERN_ORDER } from "../src/lib/chartPatternMeta";
import { ANALYSIS_VERSIONS, versionFor } from "../src/lib/versions";
import type { OHLCVBar, BacktestTrade } from "../src/lib/types";
import indicators from "../config/indicators.json";

const bar = (
  day: number,
  close = 100,
  open = close,
  high = close + 1,
  low = close - 1,
): OHLCVBar => ({
  date: `2026-01-${String(day).padStart(2, "0")}`,
  open,
  high,
  low,
  close,
  volume: 1000,
});
const signal = {
  id: "rsi_divergence",
  version: "2.0.0",
  label: "RSI",
  date: "2026-01-01",
  barIndex: 0,
  direction: "bullish" as const,
};

test("confirmation controls entry; historical origin never supplies fill", () => {
  const r = simulateTrade(
    [bar(1, 80), bar(2, 90), bar(3, 100), bar(4, 110, 105, 111, 104)],
    { ...signal, confirmedBarIndex: 2 },
    { horizon: 1, stopLossPct: 0, takeProfitPct: 0 },
  );
  assert.equal(r.status, "closed");
  if (r.status === "closed") {
    assert.equal(r.trade.entryPrice, 105);
    assert.equal(r.trade.entryBarIndex, 3);
  }
});
test("same-bar target and stop uses stop first", () => {
  const r = simulateTrade([bar(1), bar(2, 100, 100, 105, 95)], signal);
  assert.equal(r.status, "closed");
  if (r.status === "closed") {
    assert.equal(r.trade.exitPrice, 98.5);
    assert.equal(r.trade.exitReason, "stop");
  }
});
test("stop gaps fill at open and both directions use OHLC", () => {
  const bars = [bar(1), bar(2), bar(3, 90, 90, 91, 89)];
  const r = simulateTrade(bars, signal);
  assert.equal(r.status, "closed");
  if (r.status === "closed") assert.equal(r.trade.exitPrice, 90);
  const short = simulateTrade([bar(1), bar(2), bar(3, 110, 110, 111, 109)], {
    ...signal,
    direction: "bearish",
  });
  if (short.status === "closed") assert.equal(short.trade.exitPrice, 110);
  else assert.fail("short gap must close");
});
test("invalid structural prices cancel entry", () => {
  assert.equal(
    simulateTrade([bar(1), bar(2, 90)], {
      ...signal,
      stopPrice: 95,
      targetPrice: 110,
    }).status,
    "invalid",
  );
});
test("incomplete horizon is pending, not a shortened win", () => {
  assert.equal(
    simulateTrade([bar(1), bar(2, 100.2)], signal).status,
    "pending",
  );
  const stat = scoreSignalHits(
    [bar(1), bar(2, 100.2)],
    [signal],
  ).rsi_divergence;
  assert.equal(stat.samples, 0);
  assert.equal(stat.pending, 1);
});
test("fees and slippage lower net results and preserve zero-cost assumptions", () => {
  const bars = [bar(1), bar(2, 100, 100, 100, 100)];
  const r = simulateTrade(bars, signal, {
    horizon: 1,
    feeBps: 10,
    slippageBps: 10,
  });
  if (r.status === "closed") assert.ok(r.trade.returnPct < -0.39);
  else assert.fail("must settle");
});
test("opposite signal closes at following open", () => {
  const bars = [bar(1), bar(2), bar(3, 105, 104, 106, 103)];
  const r = simulateTrade(
    bars,
    signal,
    { stopLossPct: 0, takeProfitPct: 0 },
    (i) => i === 1,
  );
  if (r.status === "closed") {
    assert.equal(r.trade.exitPrice, 104);
    assert.equal(r.trade.exitReason, "signal");
  } else assert.fail("must settle");
});
test("conflicting entries skip and deterministic same-side ordering is stable", () => {
  const bars = [bar(1), bar(2, 102, 100, 103, 99.5)];
  const s = { ...signal, direction: "bearish" as const };
  const r = runPlaybookBacktest(bars, [signal, s]);
  assert.equal(r.tradeCount, 0);
  assert.equal(r.skippedConflicts, 1);
  const a = { ...signal, id: "a" };
  const b = { ...signal, id: "b" };
  assert.deepEqual(
    runPlaybookBacktest(bars, [a, b]),
    runPlaybookBacktest(bars, [b, a]),
  );
});
test("breakeven is separate; intratrade close drawdown is retained", () => {
  const trade: BacktestTrade = {
    entryDate: "a",
    exitDate: "b",
    entryPrice: 100,
    exitPrice: 100,
    returnPct: 0,
    equityReturns: [0, -20, 0],
  };
  const result = summarizeBacktestTrades([trade]);
  assert.equal(result.lossCount, 0);
  assert.equal(result.breakevenCount, 1);
  assert.equal(result.maxDrawdownPct, 20);
  assert.equal(summarizeBacktestTrades([], [0, -15]).maxDrawdownPct, 15);
});
test("formula OR exits on SMA condition and unknown grammar fails", () => {
  const bars = Array.from({ length: 55 }, (_, i) => ({
    ...bar(1),
    date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10),
    open: i < 51 ? 100 : 90,
    close: i < 51 ? 100 : 90,
    high: i < 51 ? 101 : 91,
    low: i < 51 ? 99 : 89,
  }));
  const rules = {
    entry: "close > 99",
    exit: "RSI > 101 OR close < SMA50",
    stop_loss_pct: 0,
    take_profit_pct: 0,
    horizon: 100,
  };
  const r = runBacktest(bars, rules);
  assert.equal(r.trades[0]?.exitReason, "signal");
  assert.equal(r.trades[0]?.exitBarIndex, 52);
  assert.throws(() => runBacktest(bars, { ...rules, exit: "nonsense" }));
});
test("classic family and full timing metadata reach normal backtest entry", () => {
  const s = {
    ...signal,
    id: "ma_golden_dead",
    confirmedBarIndex: 3,
    stopPrice: 90,
    targetPrice: 120,
  };
  const selected = collectSelectedSignals(
    { classicStrategies: { signals: [s] } },
    new Set(["classic:ma_golden_dead"]),
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].confirmedBarIndex, 3);
  assert.equal(selected[0].targetPrice, 120);
});
test("calendar closure handles legacy daily, weekly and monthly files", () => {
  const bars = [bar(5), bar(9), bar(12)];
  assert.deepEqual(
    closedBars(bars, "1w", "2026-01-12T12:00:00Z").map((b) => b.date),
    ["2026-01-05", "2026-01-09"],
  );
  assert.equal(closedBars(bars, "1mo", "2026-01-31T23:59:00Z").length, 0);
  assert.equal(closedBars(bars, "1mo", "2026-02-01T00:00:00Z").length, 3);
  assert.equal(closedBars([bar(12)], "1d", "2026-01-12T23:00:00Z").length, 0);
});
test("first observation is frozen after later detector revisions", () => {
  const out: (typeof signal)[] = [];
  const seen = new Set<string>();
  recordConfirmedHits([signal], [bar(1), bar(2), bar(3)], "rsi", seen, out);
  recordConfirmedHits(
    [{ ...signal, label: "changed" }],
    [bar(1), bar(2), bar(3), bar(4)],
    "rsi",
    seen,
    out,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].barIndex, 2);
  assert.equal(out[0].label, "RSI");
});
test("all catalogs have independently addressable versions", () => {
  for (const s of STRATEGY_CATALOG)
    assert.equal(versionFor(s.family, s.id), "2.0.0");
  for (const id of CANDLE_PATTERN_ORDER)
    assert.equal(versionFor("candle", id), "2.0.0");
  for (const id of CHART_PATTERN_ORDER)
    assert.equal(versionFor("chart", id), "2.0.0");
  for (const i of indicators.indicators)
    assert.equal(versionFor("indicator", i.id), "1.0.0");
  assert.equal(STRATEGY_CATALOG.length, 63);
  assert.equal(Object.keys(ANALYSIS_VERSIONS.items).length, 149);
});

test("profit factor uses compounded cash profits, and rounding noise is breakeven", () => {
  const trade: BacktestTrade = { entryDate: "a", exitDate: "b", entryPrice: 100, exitPrice: 100, returnPct: 0 };
  const result = summarizeBacktestTrades([{ ...trade, returnPct: 100 }, { ...trade, returnPct: -25 }]);
  assert.equal(result.totalReturnPct, 50);
  assert.equal(result.profitFactor, 2);
  const flat = summarizeBacktestTrades([{ ...trade, returnPct: 1e-12 }]);
  assert.equal(flat.winCount, 0);
  assert.equal(flat.lossCount, 0);
  assert.equal(flat.breakevenCount, 1);
});

test("invalid rules and execution settings fail even without an entry", () => {
  assert.throws(() => runBacktest([], { entry: "close > 1", exit: "close < 1", horizon: 0 }));
  assert.throws(() => runBacktest([], { entry: "unknown", exit: "close < 1" }));
  assert.throws(() => simulateTrade([bar(1)], signal, { feeBps: -1 }));
});

test("short borrow uses elapsed calendar days", () => {
  const result = simulateTrade([bar(1), bar(2), bar(12)], { ...signal, direction: "bearish" }, { horizon: 2, shortBorrowAprPct: 36.5 });
  assert.equal(result.status, "closed");
  if (result.status === "closed") assert.ok(Math.abs(result.trade.returnPct + 1) < 1e-10);
});

test("formula RSI follows the supplied indicator period", () => {
  const bars = Array.from({ length: 20 }, (_, index) => bar(index + 1, 100 - index));
  const rules = { entry: "RSI < 30", exit: "RSI > 70", horizon: 1, stop_loss_pct: 0, take_profit_pct: 0 };
  assert.equal(runBacktest(bars, { ...rules, rsiPeriod: 2 }).trades[0].entryBarIndex, 3);
  assert.equal(runBacktest(bars, { ...rules, rsiPeriod: 14 }).trades[0].entryBarIndex, 15);
});

test("pattern event candidates are not capped by the 24 drawing limit", () => {
  const quote = JSON.parse(readFileSync("data/NVDA-NASDAQ/1d.json", "utf8"));
  const patterns = detectChartPatterns(quote.ohlcv, { lookbackBars: quote.ohlcv.length });
  assert.ok(patterns);
  assert.ok(patterns.instances.length <= 24);
  assert.ok(patterns.allInstances!.length > 24);
  assert.ok(patterns.signals!.length > patterns.recent.length);
});
test("app evaluation is prefix invariant and delayed divergence never backdates", () => {
  const q = JSON.parse(readFileSync("data/NVDA-NASDAQ/1d.json", "utf8"));
  const bars = q.ohlcv.slice(-180);
  const options = { asOf: q.fetchedAt, trendlineAlgo: "v1" as const };
  const before = evaluateQuote(bars.slice(0, 130), "1d", indicators, options);
  const after = evaluateQuote(bars, "1d", indicators, options);
  assert.equal(after.fatalError, null);
  for (const key of [
    "patterns",
    "classicalPatterns",
    "bbStrategies",
    "ichimokuStrategies",
    "rsiStrategies",
    "volumeStrategies",
    "classicStrategies",
    "patternStrategies",
    "stochStrategies",
    "macdStrategies",
    "comboStrategies",
  ] as const) {
    assert.deepEqual(
      after[key]?.signals.filter((h) => h.barIndex < 130),
      before[key]?.signals,
    );
  }
  const divergence = after.rsiStrategies!.signals.filter(
    (h) => h.id === "rsi_divergence",
  );
  assert.ok(divergence.length > 0);
  for (const hit of divergence)
    assert.ok(hit.barIndex >= hit.originBarIndex! + 2);
  assert.ok(after.provenance?.dataFingerprint);
});
