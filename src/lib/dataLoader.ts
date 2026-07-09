import type {
  IndexFile,
  QuoteFile,
  StatusFile,
  Timeframe,
} from "./types";

import {
  indexDataPath,
  quoteDataPath,
  rawUrl,
  statusDataPath,
} from "./githubRaw";

import { DataNotFoundError, FetchError, PollTimeoutError } from "./errors";

import { validateFreshness } from "./validation";

async function fetchJsonStrict<T>(
  path: string,
  label: string,
  cacheBust = false,
): Promise<T> {
  let res: Response;
  const url = cacheBust
    ? `${rawUrl(path)}?t=${Date.now()}`
    : rawUrl(path);
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new FetchError(`Network error loading ${label}: ${path}`);
  }
  if (res.status === 404) {
    throw new DataNotFoundError(label, path);
  }
  if (!res.ok) {
    throw new FetchError(`HTTP ${res.status} loading ${label}: ${path}`);
  }
  return (await res.json()) as T;
}

async function fetchLocalJson<T>(
  path: string,
  label: string,
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new FetchError(`HTTP ${res.status} loading local ${label}: ${path}`);
  }
  return (await res.json()) as T;
}

export async function loadQuote(
  ticker: string,
  timeframe: Timeframe,
  options?: { remote?: boolean },
): Promise<QuoteFile> {
  if (!options?.remote && import.meta.env.DEV) {
    const localPath = `/data/${ticker.replace(/:/g, "-")}/${timeframe}.json`;
    const local = await fetchLocalJson<QuoteFile>(localPath, "quote");
    if (local) return local;
  }

  const remotePath = quoteDataPath(ticker, timeframe);
  return fetchJsonStrict<QuoteFile>(
    remotePath,
    `quote ${ticker} ${timeframe}`,
    options?.remote,
  );
}

export async function loadStatus(
  ticker: string,
  timeframe: Timeframe,
  cacheBust = false,
): Promise<StatusFile> {
  const path = statusDataPath(ticker, timeframe);
  return fetchJsonStrict<StatusFile>(
    path,
    `status ${ticker} ${timeframe}`,
    cacheBust,
  );
}

export async function loadIndex(options?: { remote?: boolean }): Promise<IndexFile> {
  if (!options?.remote && import.meta.env.DEV) {
    const local = await fetchLocalJson<IndexFile>("/data/index.json", "index");
    if (local) return local;
  }

  return fetchJsonStrict<IndexFile>(
    indexDataPath(),
    "data index",
    options?.remote,
  );
}

export function isFresh(quote: QuoteFile, timeframe: Timeframe): boolean {
  return validateFreshness(quote, timeframe).status === "fresh";
}

export async function pollUntilReady(
  ticker: string,
  timeframe: Timeframe,
  onTick?: (quote: QuoteFile | null, status: StatusFile | null) => void,
  intervalMs = 10000,
  maxAttempts = 60,
): Promise<QuoteFile> {
  let lastQuote: QuoteFile | null = null;
  let lastStatus: StatusFile | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      lastQuote = await loadQuote(ticker, timeframe, { remote: true });
    } catch (e) {
      if (!(e instanceof DataNotFoundError)) throw e;
      lastQuote = null;
    }

    try {
      lastStatus = await loadStatus(ticker, timeframe, true);
    } catch (e) {
      if (!(e instanceof DataNotFoundError)) throw e;
      lastStatus = null;
    }

    onTick?.(lastQuote, lastStatus);

    if (lastQuote && isFresh(lastQuote, timeframe)) return lastQuote;
    if (lastStatus?.status === "failed") {
      throw new FetchError(
        `Fetch failed for ${ticker} ${timeframe} (status: failed)`,
      );
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (lastQuote && isFresh(lastQuote, timeframe)) return lastQuote;
  throw new PollTimeoutError(ticker, timeframe);
}

export function getIndexEntry(
  index: IndexFile,
  ticker: string,
  timeframe: Timeframe,
) {
  const entry = index.entries.find(
    (e) => e.ticker === ticker && e.timeframe === timeframe,
  );
  if (!entry) {
    throw new DataNotFoundError(
      `index entry ${ticker} ${timeframe}`,
      indexDataPath(),
    );
  }
  return entry;
}

/** Unique tickers from index.json for a timeframe, newest fetch first. */
export function tickersForTimeframe(
  index: IndexFile,
  timeframe: Timeframe,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const sorted = [...index.entries]
    .filter((e) => e.timeframe === timeframe)
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  for (const e of sorted) {
    if (seen.has(e.ticker)) continue;
    seen.add(e.ticker);
    out.push(e.ticker);
  }
  return out;
}
