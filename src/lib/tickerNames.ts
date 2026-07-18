/** Display names for known tickers. Missing entries fall back to ticker only. */
const TICKER_NAMES: Record<string, string> = {
  "000660:KRX": "SK하이닉스",
  "005930:KRX": "삼성전자",
  "035420:KRX": "NAVER",
  "035720:KRX": "카카오",
  "KOSPI:KRX": "코스피",
  "KOSDAQ:KRX": "코스닥",
  "NVDA:NASDAQ": "NVIDIA",
  "AAPL:NASDAQ": "Apple",
  "MSFT:NASDAQ": "Microsoft",
  "TSLA:NASDAQ": "Tesla",
  "AMZN:NASDAQ": "Amazon",
  "GOOGL:NASDAQ": "Alphabet",
  "META:NASDAQ": "Meta",
  "NDX:INDEXNASDAQ": "나스닥100",
  ".IXIC:INDEXNASDAQ": "나스닥 종합",
  "DJI:INDEXDJX": "다우존스",
  "SPX:INDEXSP": "S&P 500",
};

export function tickerName(ticker: string): string | null {
  const key = ticker.trim().toUpperCase();
  // Preserve numeric KRX codes (000660) — toUpperCase is fine for those.
  return TICKER_NAMES[key] ?? TICKER_NAMES[ticker.trim()] ?? null;
}

/** `000660:KRX (SK하이닉스)` when a name is known, otherwise the ticker alone. */
export function formatTickerLabel(ticker: string): string {
  const name = tickerName(ticker);
  return name ? `${ticker} (${name})` : ticker;
}
