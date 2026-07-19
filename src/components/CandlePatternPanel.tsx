import { useState } from "react";
import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import {
  CANDLE_PATTERN_META,
  CANDLE_PATTERN_ORDER,
} from "@/lib/candlePatternMeta";
import { PATTERN_BIAS_META } from "@/lib/patternBias";
import {
  isCandlePatternHelpCollapsed,
  setCandlePatternHelpCollapsed,
} from "@/lib/sidebarOpenStore";

function dirVariant(d: string): "positive" | "negative" | "muted" {
  if (d === "bullish") return "positive";
  if (d === "bearish") return "negative";
  return "muted";
}

function dirLabelKo(d: string): string {
  if (d === "bullish") return "롱";
  if (d === "bearish") return "숏";
  return "중립";
}

interface Props {
  patterns: CandlePatternResult;
}

export function CandlePatternPanel({ patterns }: Props) {
  const { onLatestBar, recent, latestBarDate, lookbackBars } = patterns;
  const [helpCollapsed, setHelpCollapsed] = useState(() =>
    isCandlePatternHelpCollapsed(),
  );

  const setHelpCollapsedPersisted = (next: boolean) => {
    setCandlePatternHelpCollapsed(next);
    setHelpCollapsed(next);
  };

  return (
    <Card>
      <SectionTitle>캔들 패턴</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        전체 {lookbackBars}봉 검사 · 마지막 봉 {latestBarDate}
        {recent.length > 0 && ` · ${recent.length}건 감지`}
        {" · 차트 표시는 사이드바"}
      </p>

      <div className="mb-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-text-secondary">패턴 설명</p>
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-text-tertiary hover:border-accent/40 hover:text-text-primary"
            onClick={() => setHelpCollapsedPersisted(!helpCollapsed)}
            title={helpCollapsed ? "패턴 설명 펼치기" : "패턴 설명 접기"}
          >
            {helpCollapsed ? "펼치기" : "접기"}
          </button>
        </div>
        {!helpCollapsed && (
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {CANDLE_PATTERN_ORDER.map((id) => {
              const meta = CANDLE_PATTERN_META[id];
              const bias = PATTERN_BIAS_META[meta.typicalDirection];
              return (
                <li key={id} className="text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {meta.labelKo}
                  </span>
                  <span className="text-text-tertiary">
                    {" "}
                    · {bias.shortKo}
                  </span>
                  <span className="mt-0.5 block leading-relaxed text-text-tertiary">
                    {meta.description}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mb-4 text-left">
        <p className="text-xs font-medium text-text-secondary">최근 봉 패턴</p>
        {onLatestBar.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {onLatestBar.map((p) => (
              <Badge key={`${p.id}-${p.date}`} variant={dirVariant(p.direction)}>
                {CANDLE_PATTERN_META[p.id].labelKo} · {dirLabelKo(p.direction)}
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
                  {CANDLE_PATTERN_META[p.id].labelKo} · {dirLabelKo(p.direction)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
