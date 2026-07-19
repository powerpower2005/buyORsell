/** Persisted ChartSidebar accordion open/closed state. Default: all collapsed. */

const STORAGE_KEY = "gf:config:chart-sidebar-open";

export const SIDEBAR_OPEN_KEYS = [
  "ma",
  "sma",
  "ema",
  "bb",
  "bbBands",
  "bbStrategies",
  "swing",
  "sr",
  "trendlines",
  "tlAscending",
  "tlDescending",
  "patterns",
  "candleLong",
  "candleShort",
  "candleNeutral",
  "classicalPatterns",
  "classicalPatternShapes",
  "classicalLong",
  "classicalShort",
  "classicalBoth",
  "classicalPatternStrategies",
  "fib",
  "fibLevels",
  "fibExtras",
  "aux",
  "volume",
] as const;

export type SidebarOpenKey = (typeof SIDEBAR_OPEN_KEYS)[number];

export type SidebarOpenState = Record<SidebarOpenKey, boolean>;

function defaultOpenState(): SidebarOpenState {
  const out = {} as SidebarOpenState;
  for (const key of SIDEBAR_OPEN_KEYS) {
    out[key] = false;
  }
  return out;
}

export function getSidebarOpenState(): SidebarOpenState {
  const defaults = defaultOpenState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    const out = { ...defaults };
    for (const key of SIDEBAR_OPEN_KEYS) {
      if (typeof parsed[key] === "boolean") {
        out[key] = parsed[key];
      }
    }
    return out;
  } catch {
    return defaults;
  }
}

export function setSidebarOpenKey(key: SidebarOpenKey, open: boolean): void {
  const state = getSidebarOpenState();
  state[key] = open;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function toggleSidebarOpenKey(key: SidebarOpenKey): SidebarOpenState {
  const state = getSidebarOpenState();
  state[key] = !state[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

const COLLAPSED_KEY = "gf:config:chart-sidebar-collapsed";
const WATCHLIST_COLLAPSED_KEY = "gf:config:watchlist-collapsed";
const BROWSE_LIST_COLLAPSED_KEY = "gf:config:browse-ticker-list-collapsed";

function readCollapsedFlag(key: string, defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw) === true;
  } catch {
    return defaultValue;
  }
}

/** Whole chart-layer sidebar dock collapsed for a wider chart. Default expanded. */
export function isChartSidebarCollapsed(): boolean {
  return readCollapsedFlag(COLLAPSED_KEY, false);
}

export function setChartSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
}

/** Home 「수집된 종목」 chip strip. */
export function isWatchlistCollapsed(): boolean {
  return readCollapsedFlag(WATCHLIST_COLLAPSED_KEY, false);
}

export function setWatchlistCollapsed(collapsed: boolean): void {
  localStorage.setItem(WATCHLIST_COLLAPSED_KEY, JSON.stringify(collapsed));
}

/** Browse left ticker list. */
export function isBrowseTickerListCollapsed(): boolean {
  return readCollapsedFlag(BROWSE_LIST_COLLAPSED_KEY, false);
}

export function setBrowseTickerListCollapsed(collapsed: boolean): void {
  localStorage.setItem(BROWSE_LIST_COLLAPSED_KEY, JSON.stringify(collapsed));
}

const CANDLE_PATTERN_HELP_COLLAPSED_KEY =
  "gf:config:candle-pattern-help-collapsed";

/** CandlePatternPanel 「패턴 설명」 block. Default collapsed to save space. */
export function isCandlePatternHelpCollapsed(): boolean {
  return readCollapsedFlag(CANDLE_PATTERN_HELP_COLLAPSED_KEY, true);
}

export function setCandlePatternHelpCollapsed(collapsed: boolean): void {
  localStorage.setItem(
    CANDLE_PATTERN_HELP_COLLAPSED_KEY,
    JSON.stringify(collapsed),
  );
}
