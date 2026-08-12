import type { TrendLabel } from "../types";
import type { QuoteEvaluation } from "./evaluateQuote";

export interface StrategyHitRef {
  family: string;
  id: string;
  label: string;
  barIndex: number;
  date: string;
  direction: TrendLabel;
}

export interface StrategyConfluence {
  barIndex: number;
  date: string;
  direction: TrendLabel;
  hits: StrategyHitRef[];
}

/** Same-bar view: long-only, short-only, or both directions overlapping. */
export type StrategyConfluenceKind = "long" | "short" | "conflict";

export interface StrategyConfluenceBar {
  barIndex: number;
  date: string;
  kind: StrategyConfluenceKind;
  longHits: StrategyHitRef[];
  shortHits: StrategyHitRef[];
}

export function confluenceKindLabel(kind: StrategyConfluenceKind): string {
  if (kind === "conflict") return "충돌";
  if (kind === "long") return "롱 합의";
  return "숏 합의";
}

/** Merge direction-keyed confluences into one row per bar. */
export function groupConfluencesByBar(
  items: StrategyConfluence[] | undefined | null,
): StrategyConfluenceBar[] {
  if (!items?.length) return [];
  const byBar = new Map<number, StrategyConfluenceBar>();
  for (const c of items) {
    let row = byBar.get(c.barIndex);
    if (!row) {
      row = {
        barIndex: c.barIndex,
        date: c.date,
        kind: "long",
        longHits: [],
        shortHits: [],
      };
      byBar.set(c.barIndex, row);
    }
    if (c.direction === "bullish") row.longHits = c.hits;
    else if (c.direction === "bearish") row.shortHits = c.hits;
  }
  const out: StrategyConfluenceBar[] = [];
  for (const row of byBar.values()) {
    const hasL = row.longHits.length > 0;
    const hasS = row.shortHits.length > 0;
    if (!hasL && !hasS) continue;
    row.kind = hasL && hasS ? "conflict" : hasL ? "long" : "short";
    out.push(row);
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

function pushHits(
  out: StrategyHitRef[],
  family: string,
  bag:
    | {
        signals?: Array<{
          id: string;
          label: string;
          barIndex: number;
          date: string;
          direction: TrendLabel;
        }>;
        recent?: Array<{
          id: string;
          label: string;
          barIndex: number;
          date: string;
          direction: TrendLabel;
        }>;
      }
    | undefined
    | null,
): void {
  const list = bag?.signals ?? bag?.recent;
  if (!list?.length) return;
  for (const h of list) {
    if (h.direction !== "bullish" && h.direction !== "bearish") continue;
    out.push({
      family,
      id: h.id,
      label: h.label,
      barIndex: h.barIndex,
      date: h.date,
      direction: h.direction,
    });
  }
}

/** Flatten playbook hits (prefer uncapped signals). */
export function collectStrategyHits(ev: QuoteEvaluation): StrategyHitRef[] {
  const out: StrategyHitRef[] = [];
  pushHits(out, "bb", ev.bbStrategies);
  pushHits(out, "ichimoku", ev.ichimokuStrategies);
  pushHits(out, "volume", ev.volumeStrategies);
  pushHits(out, "rsi", ev.rsiStrategies);
  pushHits(out, "macd", ev.macdStrategies);
  pushHits(out, "stoch", ev.stochStrategies);
  pushHits(out, "pattern", ev.patternStrategies);
  pushHits(out, "combo", ev.comboStrategies);
  pushHits(out, "classic", ev.classicStrategies);
  return out;
}

/**
 * Same bar + same direction with hits from ≥ minStrategies distinct strategy ids.
 */
export function findStrategyConfluences(
  hits: StrategyHitRef[],
  minStrategies = 2,
): StrategyConfluence[] {
  const byKey = new Map<string, StrategyHitRef[]>();
  for (const h of hits) {
    const key = `${h.barIndex}|${h.direction}`;
    const list = byKey.get(key) ?? [];
    list.push(h);
    byKey.set(key, list);
  }

  const out: StrategyConfluence[] = [];
  for (const group of byKey.values()) {
    const unique = new Map<string, StrategyHitRef>();
    for (const h of group) {
      unique.set(`${h.family}:${h.id}`, h);
    }
    if (unique.size < minStrategies) continue;
    const hitsUnique = [...unique.values()];
    out.push({
      barIndex: hitsUnique[0].barIndex,
      date: hitsUnique[0].date,
      direction: hitsUnique[0].direction,
      hits: hitsUnique,
    });
  }
  return out.sort((a, b) => a.barIndex - b.barIndex);
}

export function confluencesFromEvaluation(
  ev: QuoteEvaluation,
  minStrategies = 2,
): StrategyConfluence[] {
  return findStrategyConfluences(collectStrategyHits(ev), minStrategies);
}
