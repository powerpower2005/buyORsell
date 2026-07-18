import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { describeFetchSchedule } from "@/lib/fetchSchedule";
import { formatTickerLabel } from "@/lib/tickerNames";
import { Button } from "./ui/Button";

export type AnalysisStatus =
  | "loading"
  | "missing"
  | "stale"
  | "bad-quality";

interface Props {
  status: AnalysisStatus;
  ticker: string;
  timeframe: string;
  detail?: string;
}

const TITLES: Record<AnalysisStatus, string> = {
  loading: "데이터 불러오는 중",
  missing: "데이터 없음",
  stale: "데이터가 오래됨",
  "bad-quality": "분석할 수 없는 데이터",
};

const HINTS: Record<AnalysisStatus, string> = {
  loading: "저장된 OHLCV 파일을 확인하고 있습니다.",
  missing: "이 종목·타임프레임 데이터가 아직 없습니다.",
  stale: "마지막 수집이 오래되었습니다. 아래에서 갱신하세요.",
  "bad-quality": "OHLC 품질 문제로 차트·지표를 계산할 수 없습니다. 새로 수집이 필요합니다.",
};

export function AnalysisStatusCard({
  status,
  ticker,
  timeframe,
  detail,
}: Props) {
  const issueUrl = buildFetchIssueUrl(ticker, timeframe);
  const schedule = describeFetchSchedule();
  const showIssue = status !== "loading";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-6 py-8 text-left">
      <h2 className="text-lg font-semibold text-text-primary">{TITLES[status]}</h2>
      <p className="mt-2 text-sm text-text-secondary">{HINTS[status]}</p>

      <p className="mt-3 text-sm text-text-tertiary">
        <strong className="text-text-secondary">
          {formatTickerLabel(ticker)}
        </strong>{" "}
        · {timeframe}
      </p>

      {detail && (
        <p className="mt-2 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-tertiary">
          {detail}
        </p>
      )}

      {showIssue && (
        <>
          <div className="mt-4 rounded-md border border-border/60 bg-bg px-3 py-2.5 text-sm text-text-secondary">
            <p>
              <span className="font-medium text-text-primary">자동 갱신</span>
              {" · "}6시간마다 · 다음:{" "}
              <span className="text-text-primary">{schedule.nextRun}</span>
            </p>
          </div>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
            >
              GitHub Issue로 데이터 요청
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
