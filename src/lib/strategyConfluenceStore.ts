const STORAGE_KEY = "gf:config:strategy-confluence";

/** Highlight bars where ≥2 playbook signals agree. Default on. */
export function isStrategyConfluenceVisible(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function setStrategyConfluenceVisible(visible: boolean): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
}
