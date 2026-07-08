import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface Props {
  ticker: string;
  timeframe: string;
  status?: string;
  fresh: boolean;
  polling: boolean;
  disabled?: boolean;
}

export function RequestDataButton({
  ticker,
  timeframe,
  status,
  fresh,
  polling,
  disabled,
}: Props) {
  if (fresh) {
    return <Badge variant="fresh">데이터 최신</Badge>;
  }

  const issueUrl = buildFetchIssueUrl(ticker, timeframe);

  return (
    <div className="space-y-2 text-left">
      {status === "running" || polling ? (
        <Badge variant="running">데이터 수집 중…</Badge>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            수집된 데이터가 없거나 오래되었습니다. GitHub Issue로 Sheets fetch를 요청하세요.
            <span className="mt-1 block text-text-tertiary">
              Issue에 <strong className="text-text-secondary">{ticker}</strong> · {timeframe} 이
              미리 채워집니다.
            </span>
          </p>
          <Button
            variant="primary"
            disabled={disabled || status === "running"}
            onClick={() => window.open(issueUrl, "_blank", "noopener")}
          >
            GitHub Issue로 데이터 요청
          </Button>
          <p className="text-xs text-text-tertiary">
            Mega-issue: pinned issue에 <code className="text-text-secondary">/fetch {ticker} {timeframe}</code>{" "}
            comment
          </p>
        </>
      )}
    </div>
  );
}
