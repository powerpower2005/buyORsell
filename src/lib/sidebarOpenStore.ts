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
  "classicalPatterns",
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
