import { Card, SectionTitle } from "./ui/Card";
import type { MTFAlignment } from "@/lib/types";
import { Badge } from "./ui/Badge";

export function MTFAlignmentCard({ alignment }: { alignment: MTFAlignment }) {
  if (!alignment.enabled) {
    return (
      <Card>
        <SectionTitle>Multi-TF Alignment</SectionTitle>
        <p className="text-sm text-text-secondary">
          2개 이상 타임프레임이 enable되면 방향 일치도를 표시합니다.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Multi-TF Alignment</SectionTitle>
      <p className="tabular-nums text-3xl font-bold">{alignment.alignmentPct}%</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(alignment.byTimeframe).map(([tf, trend]) => (
          <Badge key={tf} variant={trend === "bullish" ? "positive" : trend === "bearish" ? "negative" : "muted"}>
            {tf}: {trend}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
