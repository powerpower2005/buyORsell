import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import {
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
} from "@/lib/candlePatternMeta";

function dirVariant(d: string): "positive" | "negative" | "muted" {
  if (d === "bullish") return "positive";
  if (d === "bearish") return "negative";
  return "muted";
}

interface Props {
  patterns: CandlePatternResult;
}

export function CandlePatternPanel({ patterns }: Props) {
  const { onLatestBar, recent, latestBarDate, lookbackBars } = patterns;

  return (
    <Card>
      <SectionTitle>캔들 패턴</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        전체 {lookbackBars}봉 검사 · 마지막 봉 {latestBarDate}
        {recent.length > 0 && ` · ${recent.length}건 감지`}
        {" · 차트 표시는 사이드바"}
      </p>

      <div className="mb-4 text-left">
        <p className="text-xs font-medium text-text-secondary">패턴 설명</p>
        <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
          {CANDLE_PATTERN_ORDER.map((id) => {
            const meta = CANDLE_PATTERN_META[id];
            return (
              <li key={id} className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">
                  {meta.labelKo}
                </span>
                <span className="text-text-tertiary"> ({meta.label})</span>
                <span className="mt-0.5 block leading-relaxed text-text-tertiary">
                  {meta.description}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mb-4 text-left">
        <p className="text-xs font-medium text-text-secondary">최근 봉 패턴</p>
        {onLatestBar.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {onLatestBar.map((p) => (
              <Badge key={`${p.id}-${p.date}`} variant={dirVariant(p.direction)}>
                {CANDLE_PATTERN_META[p.id].labelKo} ({p.direction})
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-text-tertiary">감지된 패턴 없음</p>
        )}
      </div>

      <div className="text-left">
        <p className="text-xs font-medium text-text-secondary">검출 이력</p>
        {!recent.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            {[...recent].reverse().map((p) => (
              <li
                key={`${p.id}-${p.date}-${p.barIndex}`}
                className="flex flex-wrap items-center gap-2 text-text-secondary"
              >
                <span className="tabular-nums text-text-tertiary">{p.date}</span>
                <Badge variant={dirVariant(p.direction)}>
                  {CANDLE_PATTERN_META[p.id].labelKo}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
