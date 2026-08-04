import type { TrendLabel } from "./types";
import type { QuoteEvaluation } from "./evaluation/evaluateQuote";
import {
  collectStrategyHits,
  findStrategyConfluences,
} from "./evaluation/strategyConfluence";

export interface StrategyRecency {
  date: string;
  barIndex: number;
  /** 0 = latest bar in the evaluation window. */
  barsAgo: number;
  direction: TrendLabel;
  /** Close of the signal bar (when known). */
  close?: number | null;
  /**
   * When the latest hit shares its bar+direction with ≥1 other strategy,
   * total agreeing strategies and peer labels (excluding self).
   */
  confluenceCount?: number;
  confluencePeers?: string[];
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
  const hits = collectStrategyHits(evaluation);
  for (const h of hits) {
    const key = strategyRecencyKey(h.family, h.id);
    const prev = map.get(key);
    if (!prev || h.barIndex > prev.barIndex) {
      map.set(key, {
        date: h.date,
        barIndex: h.barIndex,
        barsAgo: lastIdx - h.barIndex,
        direction: h.direction,
        close: evaluation.bars[h.barIndex]?.close ?? null,
      });
    }
  }

  const confByBarDir = new Map<
    string,
    { count: number; labels: Map<string, string> }
  >();
  for (const c of findStrategyConfluences(hits)) {
    confByBarDir.set(`${c.barIndex}|${c.direction}`, {
      count: c.hits.length,
      labels: new Map(
        c.hits.map((h) => [`${h.family}:${h.id}`, h.label] as const),
      ),
    });
  }

  for (const [key, r] of map) {
    const conf = confByBarDir.get(`${r.barIndex}|${r.direction}`);
    if (!conf || conf.count < 2) continue;
    const peers = [...conf.labels.entries()]
      .filter(([k]) => k !== key)
      .map(([, label]) => label);
    r.confluenceCount = conf.count;
    r.confluencePeers = peers;
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

/** Inclusive min bar index for “last N bars” (N = windowBars). */
export function recentWindowMinBarIndex(
  barCount: number,
  windowBars: number,
): number {
  if (barCount <= 0 || windowBars <= 0) return barCount;
  return Math.max(0, barCount - windowBars);
}

export function isBarInRecentWindow(
  barIndex: number,
  barCount: number,
  windowBars: number,
): boolean {
  return barIndex >= recentWindowMinBarIndex(barCount, windowBars);
}

/** Filter hit bags / lists to the recent window; no-op when disabled. */
export function filterHitsByRecentWindow<T extends { barIndex: number }>(
  hits: T[] | undefined | null,
  enabled: boolean,
  barCount: number,
  windowBars: number,
): T[] {
  if (!hits?.length) return [];
  if (!enabled) return hits;
  const min = recentWindowMinBarIndex(barCount, windowBars);
  return hits.filter((h) => h.barIndex >= min);
}

/** Clone a `{ recent }` bag with optional recent-window filter. */
export function withRecentWindowHits<
  T extends { recent: Array<{ barIndex: number }> },
>(bag: T | undefined | null, enabled: boolean, barCount: number, windowBars: number): T | undefined {
  if (!bag) return undefined;
  if (!enabled) return bag;
  return {
    ...bag,
    recent: filterHitsByRecentWindow(bag.recent, true, barCount, windowBars),
  };
}

/**
 * Sidebar badge: latest bar → 오늘, near hits → N봉 전, older → MM-DD.
 * Appends signal-bar close when available.
 */
export function formatSignalClose(close: number | null | undefined): string | null {
  if (close == null || !Number.isFinite(close)) return null;
  return close.toLocaleString(undefined, {
    maximumFractionDigits: close >= 100 ? 2 : 4,
    minimumFractionDigits: 0,
  });
}

export function formatStrategyRecencyLabel(r: StrategyRecency): string {
  const when =
    r.barsAgo === 0
      ? "오늘"
      : r.barsAgo <= 9
        ? `${r.barsAgo}봉 전`
        : (() => {
            const m = r.date.match(/(\d{2})-(\d{2})$/);
            return m ? `${m[1]}-${m[2]}` : r.date;
          })();
  const px = formatSignalClose(r.close);
  return px ? `${when} · ${px}` : when;
}

export function strategyRecencyTitle(r: StrategyRecency): string {
  const px = formatSignalClose(r.close);
  const closeBit = px ? ` · 종가 ${px}` : "";
  const base =
    r.barsAgo === 0
      ? `최근 시그널 ${r.date}${closeBit} (최신 봉)`
      : `최근 시그널 ${r.date}${closeBit} (${r.barsAgo}봉 전)`;
  if (!r.confluenceCount || r.confluenceCount < 2) return base;
  const peers = r.confluencePeers?.length
    ? ` · ${r.confluencePeers.join(", ")}`
    : "";
  const dir = r.direction === "bullish" ? "상승" : "하락";
  return `${base} · 같은 봉 ${dir} 겹침 ×${r.confluenceCount}${peers}`;
}

/** Compact badge for latest-hit confluence (same bar + direction). */
export function formatStrategyConfluenceLabel(r: StrategyRecency): string | null {
  if (!r.confluenceCount || r.confluenceCount < 2) return null;
  return `겹침×${r.confluenceCount}`;
}
