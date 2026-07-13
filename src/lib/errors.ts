export class GfError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "GfError";
    this.code = code;
  }
}

export class DataNotFoundError extends GfError {
  constructor(what: string, path?: string) {
    super(
      path ? `${what} not found: ${path}` : `${what} not found`,
      "DATA_NOT_FOUND",
    );
  }
}

export class ConfigError extends GfError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
  }
}

export class InsufficientDataError extends GfError {
  constructor(message: string) {
    super(message, "INSUFFICIENT_DATA");
  }
}

export class EnvError extends GfError {
  constructor(key: string) {
    super(`Required environment variable missing: ${key}`, "ENV_MISSING");
  }
}

export class FetchError extends GfError {
  constructor(message: string) {
    super(message, "FETCH_ERROR");
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof GfError || err instanceof Error) return err.message;
  return String(err);
}

export function isInsufficientDataError(err: unknown): err is InsufficientDataError {
  return err instanceof InsufficientDataError;
}

/** Broken OHLC rows — block analysis. Short history alone is recoverable. */
export function isOhlcQualityError(err: unknown): boolean {
  if (!isInsufficientDataError(err)) return false;
  const msg = err.message;
  return (
    msg.includes("Invalid bar range") ||
    msg.includes("Empty or missing array")
  );
}
