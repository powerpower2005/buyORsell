import type { QuoteEvaluation } from "./evaluation/evaluateQuote";
import { collectStrategyHits } from "./evaluation/strategyConfluence";

export interface StrategyRecency {
  date: string;
  barIndex: number;
  /** 0 = latest bar in the evaluation window. */
  barsAgo: number;
}

export function strategyRecencyKey(family: string, id: string): string {
  return `${family}:${id}`;
}

/** Latest hit per strategy (`family:id`), from uncapped playbook signals when available. */
export function buildStrategyRecencyMap(
  evaluation: QuoteEvaluation | null | undefined,
): Map<string, StrategyRecency> {
  const map = new Map<string, StrategyRecency>();
  if (!evaluation?.bars.length) return map;
  const lastIdx = evaluation.bars.length - 1;
  for (const h of collectStrategyHits(evaluation)) {
    const key = strategyRecencyKey(h.family, h.id);
    const prev = map.get(key);
    if (!prev || h.barIndex > prev.barIndex) {
      map.set(key, {
        date: h.date,
        barIndex: h.barIndex,
        barsAgo: lastIdx - h.barIndex,
      });
    }
  }
  return map;
}

/** True when the latest signal falls inside the last `windowBars` bars. */
export function isWithinRecentWindow(
  recency: StrategyRecency | undefined,
  windowBars: number,
): boolean {
  if (!recency || windowBars <= 0) return false;
  return recency.barsAgo < windowBars;
}

/**
 * Sidebar badge: latest bar → 오늘, near hits → N봉 전, older → MM-DD.
 */
export function formatStrategyRecencyLabel(r: StrategyRecency): string {
  if (r.barsAgo === 0) return "오늘";
  if (r.barsAgo <= 9) return `${r.barsAgo}봉 전`;
  const m = r.date.match(/(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : r.date;
}

export function strategyRecencyTitle(r: StrategyRecency): string {
  if (r.barsAgo === 0) return `최근 시그널 ${r.date} (최신 봉)`;
  return `최근 시그널 ${r.date} (${r.barsAgo}봉 전)`;
}
