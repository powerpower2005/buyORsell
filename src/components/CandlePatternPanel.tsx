import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";

function dirVariant(d: string): "positive" | "negative" | "muted" {
  if (d === "bullish") return "positive";
  if (d === "bearish") return "negative";
  return "muted";
}

export function CandlePatternPanel({ patterns }: { patterns: CandlePatternResult }) {
  const { onLatestBar, recent, latestBarDate, lookbackBars } = patterns;

  return (
    <Card>
      <SectionTitle>캔들 패턴</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        최근 {lookbackBars}봉 · 마지막 봉 {latestBarDate}
      </p>

      <div className="mb-4 text-left">
        <p className="text-xs font-medium text-text-secondary">최근 봉 패턴</p>
        {onLatestBar.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {onLatestBar.map((p) => (
              <Badge key={`${p.id}-${p.date}`} variant={dirVariant(p.direction)}>
                {p.label} ({p.direction})
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-text-tertiary">감지된 패턴 없음</p>
        )}
      </div>

      <div className="text-left">
        <p className="text-xs font-medium text-text-secondary">lookback 내 역사</p>
        {!recent.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
            {[...recent].reverse().map((p) => (
              <li
                key={`${p.id}-${p.date}-${p.barIndex}`}
                className="flex flex-wrap items-center gap-2 text-text-secondary"
              >
                <span className="tabular-nums text-text-tertiary">{p.date}</span>
                <Badge variant={dirVariant(p.direction)}>{p.label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
