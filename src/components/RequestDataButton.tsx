import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface Props {
  ticker: string;
  timeframe: string;
  status?: string;
  fresh: boolean;
  disabled?: boolean;
}

export function RequestDataButton({
  ticker,
  timeframe,
  status,
  fresh,
  disabled,
}: Props) {
  if (fresh) {
    return <Badge variant="fresh">데이터 최신</Badge>;
  }

  if (status === "running") {
    return <Badge variant="running">데이터 수집 중…</Badge>;
  }

  const issueUrl = buildFetchIssueUrl(ticker, timeframe);

  return (
    <Button
      variant="primary"
      disabled={disabled || status === "running"}
      onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
    >
      GitHub Issue로 데이터 요청
    </Button>
  );
}
