import catalog from "../../config/analysis-versions.json";

export const ANALYSIS_VERSIONS = catalog;
export const EXECUTION_VERSION = versionFor("engine", "execution");
export function versionFor(namespace: string, id: string): string {
  const key = `${namespace}:${id}`;
  const entry = (catalog.items as Record<string, { version: string }>)[key];
  if (!entry) throw new Error(`Missing analysis version: ${key}`);
  return entry.version;
}
