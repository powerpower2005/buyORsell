const STORAGE_KEY = "gf:config:strategy-recency-filter";

const DEFAULT_RECENT_ONLY = false;
const DEFAULT_RECENT_BARS = 30;
const MIN_RECENT_BARS = 1;
const MAX_RECENT_BARS = 250;

interface Persisted {
  recentOnly?: boolean;
  recentBars?: number;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function save(next: Persisted): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clampRecentBars(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_RECENT_BARS;
  return Math.min(MAX_RECENT_BARS, Math.max(MIN_RECENT_BARS, Math.round(n)));
}

export function getStrategyRecentOnly(): boolean {
  return load().recentOnly ?? DEFAULT_RECENT_ONLY;
}

export function setStrategyRecentOnly(recentOnly: boolean): void {
  const cur = load();
  save({ ...cur, recentOnly });
}

export function getStrategyRecentBars(): number {
  return clampRecentBars(load().recentBars ?? DEFAULT_RECENT_BARS);
}

export function setStrategyRecentBars(recentBars: number): void {
  const cur = load();
  save({ ...cur, recentBars: clampRecentBars(recentBars) });
}

export {
  DEFAULT_RECENT_BARS,
  MIN_RECENT_BARS,
  MAX_RECENT_BARS,
};
