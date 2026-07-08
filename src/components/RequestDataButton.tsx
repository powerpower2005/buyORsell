import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface Props {
  ticker: string;
  timeframe: string;
  status?: string;
  fresh: boolean;
  polling: boolean;
  onStartPolling?: () => void;
  showPolling?: boolean;
}

export function RequestDataButton({
  ticker,
  timeframe,
  status,
  fresh,
  polling,
  onStartPolling,
  showPolling,
}: Props) {
  if (fresh) {
    return <Badge variant="fresh">데이터 최신</Badge>;
  }

  if (status === "running" || polling) {
    return <Badge variant="running">데이터 수집 중…</Badge>;
  }

  const issueUrl = buildFetchIssueUrl(ticker, timeframe);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="primary"
        onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
      >
        GitHub Issue로 데이터 요청
      </Button>
      {showPolling && onStartPolling && (
        <Button variant="secondary" onClick={onStartPolling} disabled={polling}>
          {polling ? "Polling…" : "갱신 polling"}
        </Button>
      )}
    </div>
  );
}
