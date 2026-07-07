import { Link } from "react-router-dom";
import { EXAMPLE_TICKERS } from "@/lib/urlParser";
import { Card, SectionTitle } from "../components/ui/Card";

export function GuidePage() {
  return (
    <div className="space-y-6 text-left">
      <h1 className="text-2xl font-bold">티커 입력 가이드</h1>
      <Card>
        <SectionTitle>올바른 형식</SectionTitle>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>미국 주식: NVDA:NASDAQ, AAPL:NASDAQ</li>
          <li>한국 주식: 005930:KRX</li>
          <li>암호화폐: BTC-USD</li>
        </ul>
      </Card>
      <Card>
        <SectionTitle>잘못된 형식</SectionTitle>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>NVDA — 거래소 누락</li>
          <li>NVDA-NASDAQ — 콜론(:) 사용 필요</li>
        </ul>
      </Card>
      <Card>
        <SectionTitle>데이터 요청</SectionTitle>
        <p className="text-sm text-text-secondary">
          GitHub Actions가 Google Sheets <code>GOOGLEFINANCE</code>로 OHLCV를 fetch해 repo에
          commit합니다. Service Account + 스프레드시트 설정이 필요합니다. Mega-issue에{" "}
          <code>/fetch NVDA:NASDAQ 1d</code> comment도 가능합니다.
        </p>
        <a
          href="https://www.google.com/finance"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-accent"
        >
          Google Finance 열기
        </a>
      </Card>
      <p className="text-sm text-text-tertiary">
        예시: {EXAMPLE_TICKERS.join(", ")} —{" "}
        <Link to="/">홈에서 분석</Link>
      </p>
    </div>
  );
}
