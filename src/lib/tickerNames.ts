import tickerNamesFile from "../../data/ticker-names.json";

type TickerNamesFile = {
  schemaVersion: number;
  updatedAt: string;
  names: Record<string, string>;
};

const STORE = tickerNamesFile as TickerNamesFile;

function normalizeKey(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function tickerName(ticker: string): string | null {
  const raw = ticker.trim();
  if (!raw) return null;
  const names = STORE.names ?? {};
  return names[raw] ?? names[normalizeKey(raw)] ?? null;
}

/** `000660:KRX (SK하이닉스)` when a name is known, otherwise the ticker alone. */
export function formatTickerLabel(ticker: string): string {
  const name = tickerName(ticker);
  return name ? `${ticker} (${name})` : ticker;
}
