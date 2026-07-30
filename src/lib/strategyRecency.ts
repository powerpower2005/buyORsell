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
  const base =
    r.barsAgo === 0
      ? `최근 시그널 ${r.date} (최신 봉)`
      : `최근 시그널 ${r.date} (${r.barsAgo}봉 전)`;
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
