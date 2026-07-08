import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export type AnalysisStatus =
  | "loading"
  | "missing"
  | "stale"
  | "bad-quality"
  | "polling"
  | "poll-error";

interface Props {
  status: AnalysisStatus;
  ticker: string;
  timeframe: string;
  detail?: string;
  pollError?: string;
  onPoll?: () => void;
  polling?: boolean;
}

const TITLES: Record<AnalysisStatus, string> = {
  loading: "데이터 불러오는 중",
  missing: "데이터 없음",
  stale: "데이터가 오래됨",
  "bad-quality": "분석할 수 없는 데이터",
  polling: "수집 완료 대기 중",
  "poll-error": "Polling 실패",
};

const HINTS: Record<AnalysisStatus, string> = {
  loading: "저장된 OHLCV 파일을 확인하고 있습니다.",
  missing: "이 종목·타임프레임 데이터가 아직 없습니다.",
  stale: "마지막 수집 시점이 오래되었습니다.",
  "bad-quality": "OHLC 품질 문제로 차트·지표를 계산할 수 없습니다. 새로 수집이 필요합니다.",
  polling: "GitHub Actions가 데이터를 갱신할 때까지 잠시 기다려 주세요.",
  "poll-error": "제한 시간 안에 최신 데이터가 도착하지 않았습니다.",
};

export function AnalysisStatusCard({
  status,
  ticker,
  timeframe,
  detail,
  pollError,
  onPoll,
  polling,
}: Props) {
  const issueUrl = buildFetchIssueUrl(ticker, timeframe);
  const showIssue = status !== "loading" && status !== "polling";

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-6 py-8 text-left">
      {status === "polling" || polling ? (
        <div className="mb-3">
          <Badge variant="running">Polling…</Badge>
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-text-primary">{TITLES[status]}</h2>
      <p className="mt-2 text-sm text-text-secondary">{HINTS[status]}</p>

      <p className="mt-3 text-sm text-text-tertiary">
        <strong className="text-text-secondary">{ticker}</strong> · {timeframe}
      </p>

      {detail && (
        <p className="mt-2 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-tertiary">
          {detail}
        </p>
      )}

      {pollError && (
        <p className="mt-2 text-sm text-negative">{pollError}</p>
      )}

      {showIssue && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
          >
            GitHub Issue로 데이터 요청
          </Button>
          {onPoll && (status === "stale" || status === "poll-error") && (
            <Button variant="secondary" onClick={onPoll} disabled={polling}>
              {polling ? "Polling…" : "Polling 시작"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
