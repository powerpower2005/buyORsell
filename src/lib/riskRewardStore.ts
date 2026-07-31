const STORAGE_KEY = "gf:config:risk-reward-overlay";

/** Draw entry/stop/target RR boxes for visible strategy hits. Default on. */
export function isRiskRewardOverlayVisible(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function setRiskRewardOverlayVisible(visible: boolean): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
}
