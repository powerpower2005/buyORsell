import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { SupportResistanceResult } from "@/lib/evaluation/supportResistance";
import {
  srQualityGradeVariant,
  srZoneLabel,
} from "@/lib/evaluation/supportResistance";

interface Props {
  sr: SupportResistanceResult;
}

export function SupportResistancePanel({ sr }: Props) {
  const supports = sr.zones.filter((z) => z.kind === "support");
  const resistances = sr.zones.filter((z) => z.kind === "resistance");

  return (
    <Card>
      <SectionTitle>수평 지지·저항</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        스윙 고/저 클러스터 · 가격대 최대 중간가 ±
        {(sr.maxZonePct * 100).toFixed(0)}% · 존 {sr.zones.length}개 · 차트
        표시는 사이드바
      </p>
      <p className="mb-4 text-xs leading-relaxed text-text-tertiary">
        품질은 캔들 터치(2–4회 적정, 과다 시 돌파 위험), 터치 후 반등/거부 폭,
        거래량, 유지 기간으로 점수화합니다.
      </p>

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
