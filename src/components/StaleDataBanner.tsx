import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface Props {
  ticker: string;
  timeframe: string;
  detail?: string;
  onPoll?: () => void;
  polling?: boolean;
  pollError?: string;
}

export function StaleDataBanner({
  ticker,
  timeframe,
  detail,
  onPoll,
  polling,
  pollError,
}: Props) {
  const issueUrl = buildFetchIssueUrl(ticker, timeframe);

  return (
    <div className="rounded-xl border border-negative/30 bg-negative/10 px-4 py-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="stale">데이터 오래됨</Badge>
        <p className="text-sm font-medium text-text-primary">
          참고용으로 표시 중입니다. 최신 데이터로 갱신하는 것을 권장합니다.
        </p>
      </div>

      {detail && (
        <p className="mt-2 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-tertiary">
          {detail}
        </p>
      )}

      {pollError && (
        <p className="mt-2 text-sm text-negative">{pollError}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
        >
          GitHub Issue로 데이터 요청
        </Button>
        {onPoll && (
          <Button variant="secondary" onClick={onPoll} disabled={polling}>
            {polling ? "Polling…" : "Polling 시작"}
          </Button>
        )}
      </div>
    </div>
  );
}
