export interface ParsedTicker {
  ticker: string;
  valid: boolean;
  hint: string;
  source: "direct" | "url" | "invalid";
}

const STOCK_PATTERN = /^[A-Z0-9.]+:[A-Z]+$/;
const CRYPTO_PATTERN = /^[A-Z0-9]+-[A-Z]+$/;
const URL_PATTERN = /\/quote\/([^/?]+)/i;

export function parseTickerInput(input: string): ParsedTicker {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return {
      ticker: "",
      valid: false,
      hint: "티커 또는 Google Finance URL을 입력하세요.",
      source: "invalid",
    };
  }

  const urlMatch = trimmed.match(URL_PATTERN);
  if (urlMatch) {
    const ticker = decodeURIComponent(urlMatch[1]);
    return {
      ticker,
      valid: STOCK_PATTERN.test(ticker) || CRYPTO_PATTERN.test(ticker),
      hint: `URL에서 ${ticker} 추출됨`,
      source: "url",
    };
  }

  if (STOCK_PATTERN.test(trimmed) || CRYPTO_PATTERN.test(trimmed)) {
    return {
      ticker: trimmed,
      valid: true,
      hint: "올바른 형식입니다.",
      source: "direct",
    };
  }

  if (trimmed.includes("-") && !trimmed.includes(":")) {
    return {
      ticker: trimmed,
      valid: false,
      hint: "하이픈(-) 대신 콜론(:)을 사용하세요. 예: NVDA:NASDAQ",
      source: "invalid",
    };
  }

  if (!trimmed.includes(":") && !trimmed.includes("-")) {
    return {
      ticker: trimmed,
      valid: false,
      hint: "거래소가 필요합니다. Google Finance URL에서 :NASDAQ 부분을 포함해 주세요.",
      source: "invalid",
    };
  }

  return {
    ticker: trimmed,
    valid: false,
    hint: "NVDA:NASDAQ 형식으로 입력하거나 Google Finance URL을 붙여넣어 주세요.",
    source: "invalid",
  };
}

export const EXAMPLE_TICKERS = [
  "NVDA:NASDAQ",
  "AAPL:NASDAQ",
  "TSLA:NASDAQ",
  "005930:KRX",
  "BTC-USD",
];
