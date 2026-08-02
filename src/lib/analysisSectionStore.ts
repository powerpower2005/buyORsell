/** Persisted open/closed state for analysis detail accordion sections. */

export const ANALYSIS_SECTION_IDS = [
  "overview",
  "structure",
  "patterns",
  "indicators",
  "tools",
] as const;

export type AnalysisSectionId = (typeof ANALYSIS_SECTION_IDS)[number];

export type AnalysisSectionOpenState = Record<AnalysisSectionId, boolean>;

const STORAGE_KEY = "gf:config:analysis-sections-open";

/** Default: overview open, rest collapsed. */
function defaultOpenState(): AnalysisSectionOpenState {
  return {
    overview: true,
    structure: false,
    patterns: false,
    indicators: false,
    tools: false,
  };
}

export function getAnalysisSectionOpenState(): AnalysisSectionOpenState {
  const defaults = defaultOpenState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    const out = { ...defaults };
    for (const id of ANALYSIS_SECTION_IDS) {
      if (typeof parsed[id] === "boolean") out[id] = parsed[id];
    }
    return out;
  } catch {
    return defaults;
  }
}

export function toggleAnalysisSection(id: AnalysisSectionId): AnalysisSectionOpenState {
  const state = getAnalysisSectionOpenState();
  state[id] = !state[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}
