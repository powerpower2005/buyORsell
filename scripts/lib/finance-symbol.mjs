const US_ORDER = ["NASDAQ", "NYSE", "NYSEARCA", "BATS", "NYSEAMERICAN"];

const KR_ORDER = {
  KOSDAQ: ["KOSDAQ", "KRX", "KOSPI"],
  KOSPI: ["KOSPI", "KRX", "KOSDAQ"],
  KRX: ["KRX", "KOSDAQ", "KOSPI"],
};

/**
 * Build ordered GOOGLEFINANCE symbol candidates (EXCHANGE:TICKER).
 * Ported from Hedge scripts/common/models.py + instrument_key.py
 */
export function financeSymbolCandidates(ticker) {
  const t = ticker.trim().toUpperCase();

  if (t.includes("-") && !t.includes(":")) {
    return [t];
  }

  if (!t.includes(":")) {
    throw new Error(
      `Invalid ticker for Sheets GOOGLEFINANCE: ${ticker} (expected SYMBOL:EXCHANGE)`,
    );
  }

  const [sym, exchange] = t.split(":");
  const ex = exchange.toUpperCase();

  if (US_ORDER.includes(ex)) {
    const rest = US_ORDER.filter((x) => x !== ex);
    return [ex, ...rest].map((p) => `${p}:${sym}`);
  }

  if (KR_ORDER[ex]) {
    return KR_ORDER[ex].map((p) => `${p}:${sym}`);
  }

  if (ex === "HKG") {
    return [`HKG:${sym}`];
  }

  return [`${ex}:${sym}`];
}
