import clsx from "clsx";
import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import { structureRegimeLabel } from "@/lib/evaluation/swingStructure";
import {
  SWING_CHART_TOGGLE_META,
  SWING_CHART_TOGGLE_ORDER,
  anySwingChartVisible,
  setSwingChartVisible,
  type SwingChartToggleId,
} from "@/lib/swingStructureStore";

function regimeVariant(
  regime: string,
): "positive" | "negative" | "muted" {
  if (regime === "bullish") return "positive";
  if (regime === "bearish") return "negative";
  return "muted";
}

interface Props {
  structure: SwingStructureResult;
  chartVisibility: Record<SwingChartToggleId, boolean>;
  onChartVisibilityChange: () => void;
}

export function SwingStructurePanel({
  structure,
  chartVisibility,
  onChartVisibilityChange,
}: Props) {
  const { current, swings, transitions, leftRight } = structure;
  const labeled = swings.filter((s) => s.label);
  const chartEnabled = anySwingChartVisible(chartVisibility);

  const toggle = (id: SwingChartToggleId, visible: boolean) => {
    setSwingChartVisible(id, visible);
    onChartVisibilityChange();
  };

  return (
    <Card>
      <SectionTitle>스윙 구조 (HH/HL)</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        fractal ±{leftRight}봉 · 라벨 {labeled.length}개
        {transitions.length > 0 && ` · 전환 ${transitions.length}회`}
        {chartEnabled && " · 차트 마커 표시 중"}
      </p>

      <div className="mb-4 rounded-md border border-border bg-bg px-3 py-2.5 text-left">
        <p className="text-xs text-text-tertiary">현재 구조</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={regimeVariant(current.regime)}>
            {structureRegimeLabel(current.regime)}
          </Badge>
          <span className="text-sm text-text-secondary">{current.summary}</span>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          최근 고 {current.lastHighLabel ?? "—"} · 최근 저{" "}
          {current.lastLowLabel ?? "—"}
        </p>
      </div>

      <div className="mb-5 text-left">
        <p className="text-xs font-medium text-text-secondary">차트 마커</p>
        <p className="mt-1 text-xs text-text-tertiary">
          기본적으로 꺼져 있습니다. HH+HL 연속 / LL+LH 연속·전환을 보고 싶은
          항목만 켜세요.
        </p>
        <ul className="mt-3 space-y-2">
          {SWING_CHART_TOGGLE_ORDER.map((id) => {
            const meta = SWING_CHART_TOGGLE_META[id];
            const enabled = chartVisibility[id];
            return (
              <li
                key={id}
                className={clsx(
                  "rounded-md border px-3 py-2 transition-colors",
                  enabled ? "border-accent/40 bg-accent/5" : "border-border bg-bg",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                    onChange={(e) => toggle(id, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {meta.labelKo}
                      </span>
                      <span className="text-xs text-text-tertiary">{meta.label}</span>
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
        <p className="text-xs font-medium text-text-secondary">최근 전환</p>
        {!transitions.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
            {[...transitions].reverse().slice(0, 12).map((t) => (
              <li
                key={`${t.date}-${t.barIndex}-${t.to}`}
                className="flex flex-wrap items-center gap-2 text-text-secondary"
              >
                <span className="tabular-nums text-text-tertiary">{t.date}</span>
                <Badge variant={regimeVariant(t.to)}>
                  {t.from === "bullish" ? "상승" : "하락"} →{" "}
                  {t.to === "bullish" ? "상승" : "하락"}
                </Badge>
                <span className="text-xs text-text-tertiary">
                  trigger {t.triggerLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-left">
        <p className="text-xs font-medium text-text-secondary">스윙 라벨 이력</p>
        {!labeled.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
            {[...labeled].reverse().slice(0, 40).map((s) => (
              <li
                key={`${s.date}-${s.barIndex}-${s.label}`}
                className="flex flex-wrap items-center gap-2 text-text-secondary"
              >
                <span className="tabular-nums text-text-tertiary">{s.date}</span>
                <Badge
                  variant={
                    s.label === "HH" || s.label === "HL" ? "positive" : "negative"
                  }
                >
                  {s.label}
                </Badge>
                <span className="tabular-nums text-xs text-text-tertiary">
                  {s.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
