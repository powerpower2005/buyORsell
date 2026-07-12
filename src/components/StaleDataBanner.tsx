import { buildFetchIssueUrl } from "@/lib/issueUrl";
import { describeFetchSchedule } from "@/lib/fetchSchedule";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface Props {
  ticker: string;
  timeframe: string;
  detail?: string;
}

export function StaleDataBanner({ ticker, timeframe, detail }: Props) {
  const issueUrl = buildFetchIssueUrl(ticker, timeframe);
  const schedule = describeFetchSchedule();

  return (
    <div className="rounded-xl border border-negative/30 bg-negative/10 px-4 py-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="stale">데이터 오래됨</Badge>
        <p className="text-sm font-medium text-text-primary">
          참고용으로 표시 중입니다. 최신 데이터로 갱신하는 것을 권장합니다.
        </p>
      </div>

      <div className="mt-3 rounded-md border border-border/60 bg-bg px-3 py-2.5 text-sm text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">자동 갱신</span>
          {" · "}6시간마다 (GitHub Actions cron)
        </p>
        <p className="mt-1">
          다음 실행: <span className="text-text-primary">{schedule.nextRun}</span>
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          하루 갱신 시각{schedule.timezone ? ` (${schedule.timezone})` : ""}:{" "}
          {schedule.dailyRuns}
        </p>
      </div>

      {detail && (
        <p className="mt-2 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-tertiary">
          {detail}
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="primary"
          onClick={() => window.open(issueUrl, "_blank", "noopener,noreferrer")}
        >
          GitHub Issue로 데이터 요청
        </Button>
        <p className="mt-2 text-xs text-text-tertiary">
          지금 바로 갱신하려면 Issue를 제출하세요. 완료 후 페이지를 새로고침하면 반영됩니다.
        </p>
      </div>
    </div>
  );
}
