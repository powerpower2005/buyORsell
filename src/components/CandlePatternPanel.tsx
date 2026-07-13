import clsx from "clsx";
import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { CandlePatternId, CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import {
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
} from "@/lib/candlePatternMeta";
import {
  anyChartPatternVisible,
  setChartPatternVisible,
} from "@/lib/candlePatternStore";

function dirVariant(d: string): "positive" | "negative" | "muted" {
  if (d === "bullish") return "positive";
  if (d === "bearish") return "negative";
  return "muted";
}

interface Props {
  patterns: CandlePatternResult;
  chartVisibility: Record<CandlePatternId, boolean>;
  onChartVisibilityChange: () => void;
}

export function CandlePatternPanel({
  patterns,
  chartVisibility,
  onChartVisibilityChange,
}: Props) {
  const { onLatestBar, recent, latestBarDate, lookbackBars } = patterns;
  const chartEnabled = anyChartPatternVisible(chartVisibility);

  const toggleChartPattern = (id: CandlePatternId, visible: boolean) => {
    setChartPatternVisible(id, visible);
    onChartVisibilityChange();
  };

  return (
    <Card>
      <SectionTitle>캔들 패턴</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        전체 {lookbackBars}봉 검사 · 마지막 봉 {latestBarDate}
        {recent.length > 0 && ` · ${recent.length}건 감지`}
        {chartEnabled && " · 차트에 마커 표시 중"}
      </p>

      <div className="mb-5 text-left">
        <p className="text-xs font-medium text-text-secondary">차트 마커</p>
        <p className="mt-1 text-xs text-text-tertiary">
          기본적으로 차트에는 표시하지 않습니다. 보고 싶은 패턴만 켜세요.
        </p>
        <ul className="mt-3 space-y-3">
          {CANDLE_PATTERN_ORDER.map((id) => {
            const meta = CANDLE_PATTERN_META[id];
            const enabled = chartVisibility[id];
            return (
              <li
                key={id}
                className={clsx(
                  "rounded-md border px-3 py-2.5 transition-colors",
                  enabled ? "border-accent/40 bg-accent/5" : "border-border bg-bg",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                    onChange={(e) => toggleChartPattern(id, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {meta.labelKo}
                      </span>
                      <span className="text-xs text-text-tertiary">{meta.label}</span>
                      <Badge variant={dirVariant(meta.typicalDirection)}>
                        {meta.typicalDirection}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                      {meta.description}
                    </span>
                  </span>
                </label>
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
