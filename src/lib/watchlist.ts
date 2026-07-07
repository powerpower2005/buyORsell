const KEY = "gf:watchlist";

export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(tickers: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(tickers));
}

export function toggleWatchlist(ticker: string): string[] {
  const list = loadWatchlist();
  const next = list.includes(ticker)
    ? list.filter((t) => t !== ticker)
    : [...list, ticker];
  saveWatchlist(next);
  return next;
}

export function addWatchlist(ticker: string): string[] {
  const list = loadWatchlist();
  if (list.includes(ticker)) return list;
  const next = [...list, ticker];
  saveWatchlist(next);
  return next;
}
