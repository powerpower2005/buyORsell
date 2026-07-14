import clsx from "clsx";
import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import {
  srQualityGradeVariant,
  srZoneLabel,
} from "@/lib/evaluation/supportResistance";
import {
  SR_CHART_TOGGLE_META,
  SR_CHART_TOGGLE_ORDER,
  anySrChartVisible,
  setSrChartVisible,
  type SrChartToggleId,
} from "@/lib/srZoneStore";

interface Props {
  sr: SupportResistanceResult;
  chartVisibility: Record<SrChartToggleId, boolean>;
  onChartVisibilityChange: () => void;
}

export function SupportResistancePanel({
  sr,
  chartVisibility,
  onChartVisibilityChange,
}: Props) {
  const chartEnabled = anySrChartVisible(chartVisibility);
  const supports = sr.zones.filter((z) => z.kind === "support");
  const resistances = sr.zones.filter((z) => z.kind === "resistance");

  const toggle = (id: SrChartToggleId, visible: boolean) => {
    setSrChartVisible(id, visible);
    onChartVisibilityChange();
  };

  return (
    <Card>
      <SectionTitle>수평 지지·저항</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        스윙 고/저 클러스터 · 허용폭 ATR×{sr.clusterAtrMult} · 존{" "}
        {sr.zones.length}개
        {chartEnabled && " · 차트 표시 중"}
      </p>
      <p className="mb-4 text-xs leading-relaxed text-text-tertiary">
        품질은 캔들 터치(2–4회 적정, 과다 시 돌파 위험), 터치 후 반등/거부 폭,
        거래량, 유지 기간으로 점수화합니다.
      </p>

      <div className="mb-5 text-left">
        <p className="text-xs font-medium text-text-secondary">차트 표시</p>
        <p className="mt-1 text-xs text-text-tertiary">
          기본은 꺼져 있습니다. 단일 가격선이 아니라 가격대(밴드)로 그립니다.
        </p>
        <ul className="mt-3 space-y-2">
          {SR_CHART_TOGGLE_ORDER.map((id) => {
            const meta = SR_CHART_TOGGLE_META[id];
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

      <div className="text-left">
        <p className="text-xs font-medium text-text-secondary">감지된 가격대</p>
        {!sr.zones.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-80 space-y-3 overflow-y-auto">
            {sr.zones.map((z) => {
              const q = z.quality;
              return (
                <li
                  key={z.id}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={z.kind === "support" ? "positive" : "negative"}
                    >
                      {z.kind === "support" ? "지지" : "저항"}
                    </Badge>
                    <Badge variant={srQualityGradeVariant(q.grade)}>
                      품질 {q.grade}
                    </Badge>
                    {q.broken && <Badge variant="negative">이탈/돌파</Badge>}
                    {q.overtouchCaution && !q.broken && (
                      <Badge variant="muted">터치 주의</Badge>
                    )}
                    <span className="tabular-nums text-sm text-text-primary">
                      {srZoneLabel(z).replace(/^(지지|저항)\s/, "")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{q.summary}</p>
                  <p className="mt-1 text-xs tabular-nums text-text-tertiary">
                    캔들 터치 {q.candleTouches}봉 · 이벤트 {q.touchEvents}회 ·
                    점수 {q.score}
                    {q.avgBounceAtr != null &&
                      ` · 반등 ${q.avgBounceAtr.toFixed(2)} ATR`}
                    {q.avgVolumeRatio != null &&
                      ` · vol ${q.avgVolumeRatio.toFixed(2)}×`}
                    {` · 유지 ${q.spanBars}봉`}
                    {` · ${z.firstDate}~${z.lastDate}`}
                  </p>
                  {q.caution && (
                    <p className="mt-1.5 text-xs leading-relaxed text-negative">
                      {q.caution}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-text-tertiary">
          지지 {supports.length} · 저항 {resistances.length}
        </p>
      </div>
    </Card>
  );
}
