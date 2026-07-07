import { Link } from "react-router-dom";
import { EXAMPLE_TICKERS } from "@/lib/urlParser";
import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Card, SectionTitle } from "../components/ui/Card";

export function GuidePage() {
  const sampleIssueUrl = buildFetchIssueUrl("NVDA:NASDAQ", "1d");

  return (
    <div className="space-y-6 text-left">
      <h1 className="text-2xl font-bold">사용 가이드</h1>

      <Card>
        <SectionTitle>1. 티커 형식</SectionTitle>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>미국 주식: NVDA:NASDAQ, AAPL:NASDAQ</li>
          <li>한국 주식: 005930:KRX</li>
          <li>암호화폐: BTC-USD</li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>2. 데이터 수집 (Google Sheets)</SectionTitle>
        <ol className="list-inside list-decimal space-y-2 text-sm text-text-secondary">
          <li>
            GitHub에서 <strong>Fetch Quote Data</strong> Issue를 연다.
          </li>
          <li>티커·타임프레임(보통 1d)을 입력하고 제출한다.</li>
          <li>
            Actions가 Spreadsheet <code>GOOGLEFINANCE(...,&quot;all&quot;)</code>로 OHLCV를
            가져와 <code>data/</code>에 commit한다.
          </li>
          <li>1~3분 후 앱을 새로고침하거나 polling을 시작한다.</li>
        </ol>
        <a
          href={sampleIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent"
        >
          Fetch Issue 열기 (예: NVDA:NASDAQ)
        </a>
        <p className="mt-2 text-xs text-text-tertiary">
          Mega-issue에 <code>/fetch NVDA:NASDAQ 1d</code> 댓글을 달아도 동일하게 실행됩니다.
        </p>
      </Card>

      <Card>
        <SectionTitle>3. 수집된 종목 목록</SectionTitle>
        <p className="text-sm text-text-secondary">
          fetch가 끝난 티커는 <code>data/index.json</code>에 등록됩니다. 홈 화면 상단{" "}
          <strong>수집된 종목</strong>에서 현재 타임프레임에 맞는 종목을 골라 바로 분석할 수
          있습니다.
        </p>
      </Card>

      <Card>
        <SectionTitle>잘못된 형식</SectionTitle>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>NVDA — 거래소 누락</li>
          <li>NVDA-NASDAQ — 주식은 콜론(:) 사용 (NVDA:NASDAQ)</li>
        </ul>
      </Card>

      <p className="text-sm text-text-tertiary">
        예시: {EXAMPLE_TICKERS.join(", ")} —{" "}
        <Link to="/">홈에서 분석</Link>
      </p>
    </div>
  );
}
