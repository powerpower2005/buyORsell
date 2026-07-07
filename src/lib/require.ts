import { ConfigError, EnvError, InsufficientDataError } from "./errors";

export function requireDefined<T>(
  value: T | null | undefined,
  label: string,
): T {
  if (value === null || value === undefined) {
    throw new ConfigError(`Missing required value: ${label}`);
  }
  return value;
}

export function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ConfigError(`Missing or invalid number: ${label}`);
  }
  return value;
}

export function requireNonEmptyArray<T>(arr: T[], label: string): T[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new InsufficientDataError(`Empty or missing array: ${label}`);
  }
  return arr;
}

export function requireMinBars(
  barCount: number,
  min: number,
  context: string,
): void {
  if (barCount < min) {
    throw new InsufficientDataError(
      `${context}: need at least ${min} bars, got ${barCount}`,
    );
  }
}

export function requireEnv(value: string | undefined, key: string): string {
  if (!value || !value.trim()) {
    throw new EnvError(key);
  }
  return value.trim();
}
