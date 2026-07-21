/** Manual buy/sell journal entries (personal review). */

export type TradeJournalSide = "buy" | "sell";

export interface TradeJournalEntry {
  id: string;
  ticker: string;
  timeframe: string;
  /** Bar date YYYY-MM-DD (or nearest match). */
  date: string;
  price: number;
  side: TradeJournalSide;
  note: string;
  /** Catalog keys `family:id` or free labels. */
  strategies: string[];
  createdAt: string;
}

const STORAGE_KEY = "gf:journal:entries";

function loadAll(): TradeJournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TradeJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(entries: TradeJournalEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listJournalEntries(
  ticker: string,
  timeframe: string,
): TradeJournalEntry[] {
  return loadAll()
    .filter((e) => e.ticker === ticker && e.timeframe === timeframe)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function addJournalEntry(
  input: Omit<TradeJournalEntry, "id" | "createdAt">,
): TradeJournalEntry {
  const entry: TradeJournalEntry = {
    ...input,
    id: `tj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    note: input.note.trim(),
    strategies: input.strategies.filter(Boolean),
  };
  const all = loadAll();
  all.push(entry);
  saveAll(all);
  return entry;
}

export function removeJournalEntry(id: string): void {
  saveAll(loadAll().filter((e) => e.id !== id));
}

export function clearJournalForTicker(ticker: string, timeframe: string): void {
  saveAll(
    loadAll().filter(
      (e) => !(e.ticker === ticker && e.timeframe === timeframe),
    ),
  );
}
