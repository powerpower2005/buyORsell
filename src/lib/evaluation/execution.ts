import type { OHLCVBar, BacktestTrade, TrendLabel } from "../types";
import { EXECUTION_VERSION } from "../versions";

export interface ExecutionSignal {
  id: string;
  label?: string;
  date?: string;
  barIndex: number;
  confirmedBarIndex?: number;
  direction: TrendLabel;
  version?: string;
  stopPrice?: number | null;
  targetPrice?: number | null;
}

export interface ExecutionOptions {
  horizon?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  feeBps?: number;
  slippageBps?: number;
  shortBorrowAprPct?: number;
  useSignalLevels?: boolean;
}

export const DEFAULT_EXECUTION = {
  horizon: 12,
  stopLossPct: 1.5,
  takeProfitPct: 1.5,
  feeBps: 0,
  slippageBps: 0,
  shortBorrowAprPct: 0,
  useSignalLevels: true,
};

export function executionOptions(options: ExecutionOptions = {}) {
  const settings = { ...DEFAULT_EXECUTION, ...options };
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Invalid execution parameter: ${key}`);
    }
  }
  if (!Number.isInteger(settings.horizon) || settings.horizon < 1)
    throw new Error("보유 봉수는 1 이상의 정수여야 합니다.");
  return settings;
}

export function simulateTrade(
  bars: OHLCVBar[],
  signal: ExecutionSignal,
  options: ExecutionOptions = {},
  exitSignalAt?: (barIndex: number) => boolean,
):
  | { status: "closed"; trade: BacktestTrade }
  | { status: "pending"; equityReturns?: number[] }
  | { status: "invalid" } {
  const cfg = executionOptions(options);
  const confirmed = signal.confirmedBarIndex ?? signal.barIndex;
  const start = confirmed + 1;
  if (
    signal.id === "fake_breakout" ||
    signal.direction === "neutral" ||
    confirmed < 0
  )
    return { status: "invalid" };
  if (start >= bars.length) return { status: "pending" };
  const sign = signal.direction === "bullish" ? 1 : -1;
  const entry = bars[start].open * (1 + (sign * cfg.slippageBps) / 10000);
  if (!(entry > 0)) return { status: "invalid" };
  const useLevels =
    cfg.useSignalLevels &&
    signal.stopPrice != null &&
    signal.targetPrice != null;
  const stop = useLevels
    ? signal.stopPrice!
    : entry * (1 - (sign * cfg.stopLossPct) / 100);
  const target = useLevels
    ? signal.targetPrice!
    : entry * (1 + (sign * cfg.takeProfitPct) / 100);
  const hasStop = useLevels || cfg.stopLossPct > 0;
  const hasTarget = useLevels || cfg.takeProfitPct > 0;
  // A gap through a structural invalidation/target cancels entry.
  if (
    (hasStop && (!Number.isFinite(stop) || sign * (entry - stop) <= 0)) ||
    (hasTarget && (!Number.isFinite(target) || sign * (target - entry) <= 0))
  )
    return { status: "invalid" };
  const end = start + cfg.horizon - 1;
  const equityReturns = [-cfg.feeBps / 100];
  const netReturn = (price: number, index: number, closing: boolean) => {
    const elapsedDays = Math.max(
      0,
      (Date.parse(bars[index].date) - Date.parse(bars[start].date)) / 86400000,
    );
    const borrow = sign < 0 ? (cfg.shortBorrowAprPct * elapsedDays) / 365 : 0;
    const fee = (cfg.feeBps / 100) * (1 + (closing ? price / entry : 0));
    return sign * (price / entry - 1) * 100 - fee - borrow;
  };
  for (let index = start; index <= Math.min(end, bars.length - 1); index++) {
    const bar = bars[index];
    let price: number | null = null;
    let reason = "";
    if (index > start && exitSignalAt?.(index - 1)) {
      price = bar.open;
      reason = "signal";
    } else if (hasStop && sign * (bar.open - stop) <= 0) {
      price = bar.open;
      reason = "stop-gap";
    } else if (hasTarget && sign * (bar.open - target) >= 0) {
      price = bar.open;
      reason = "take-gap";
    } else if (hasStop && (sign > 0 ? bar.low <= stop : bar.high >= stop)) {
      price = stop;
      reason = "stop";
    } else if (
      hasTarget &&
      (sign > 0 ? bar.high >= target : bar.low <= target)
    ) {
      price = target;
      reason = "take";
    } else if (index === end) {
      price = bar.close;
      reason = "horizon";
    }
    if (price != null) {
      const fill = price * (1 - (sign * cfg.slippageBps) / 10000);
      const returnPct = netReturn(fill, index, true);
      equityReturns.push(returnPct);
      return {
        status: "closed",
        trade: {
          signalDate: bars[confirmed]?.date,
          entryDate: bars[start].date,
          exitDate: bar.date,
          entryPrice: entry,
          exitPrice: fill,
          returnPct,
          side: sign > 0 ? "long" : "short",
          entryBarIndex: start,
          exitBarIndex: index,
          strategyId: signal.id,
          strategyLabel: signal.label,
          strategyVersion: signal.version,
          executionVersion: EXECUTION_VERSION,
          exitReason: reason,
          equityReturns,
        },
      };
    }
    equityReturns.push(netReturn(bar.close, index, false));
  }
  return { status: "pending", equityReturns };
}
