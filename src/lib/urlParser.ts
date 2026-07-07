export interface ParsedTicker {
  ticker: string;
  valid: boolean;
  hint: string;
}

const STOCK_PATTERN = /^[A-Z0-9.]+:[A-Z]+$/;
const CRYPTO_PATTERN = /^[A-Z0-9]+-[A-Z]+$/;

export function parseTickerInput(input: string): ParsedTicker {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return {
      ticker: "",
      valid: false,
      hint: "티커를 입력하세요. 예: NVDA:NASDAQ",
    };
  }

  if (STOCK_PATTERN.test(trimmed) || CRYPTO_PATTERN.test(trimmed)) {
    return {
      ticker: trimmed,
      valid: true,
      hint: "올바른 형식입니다.",
    };
  }

  if (trimmed.includes("-") && !trimmed.includes(":")) {
    return {
      ticker: trimmed,
      valid: false,
      hint: "주식은 콜론(:)을 사용하세요. 예: NVDA:NASDAQ (암호화폐는 BTC-USD)",
    };
  }

  if (!trimmed.includes(":") && !trimmed.includes("-")) {
    return {
      ticker: trimmed,
      valid: false,
      hint: "거래소가 필요합니다. 예: NVDA:NASDAQ",
    };
  }

  return {
    ticker: trimmed,
    valid: false,
    hint: "NVDA:NASDAQ 또는 BTC-USD 형식으로 입력해 주세요.",
  };
}

export const EXAMPLE_TICKERS = [
  "NVDA:NASDAQ",
  "AAPL:NASDAQ",
  "TSLA:NASDAQ",
  "005930:KRX",
  "BTC-USD",
];
