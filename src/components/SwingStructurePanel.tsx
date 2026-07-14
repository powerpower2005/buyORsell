import { Card, SectionTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { SwingStructureResult } from "@/lib/evaluation/swingStructure";
import {
  qualityGradeVariant,
  slopeBandLabel,
  structureRegimeLabel,
} from "@/lib/evaluation/swingStructure";

function regimeVariant(
  regime: string,
): "positive" | "negative" | "muted" {
  if (regime === "bullish") return "positive";
  if (regime === "bearish") return "negative";
  return "muted";
}

function slopeVariant(
  band: string,
): "positive" | "negative" | "muted" {
  if (band === "ideal") return "positive";
  if (band === "overheated") return "negative";
  return "muted";
}

interface Props {
  structure: SwingStructureResult;
}

export function SwingStructurePanel({ structure }: Props) {
  const { current, swings, transitions, leftRight, quality, streaks } = structure;
  const labeled = swings.filter((s) => s.label);
  const q = quality.current;

  const breakdownText = (side: "bullish" | "bearish") => {
    const b = streaks[side].currentBreakdown;
    const parts = (Object.entries(b) as [string, number][])
      .filter(([, n]) => n > 0)
      .map(([lab, n]) => `${lab} ${n}`);
    return parts.length ? parts.join(" · ") : null;
  };

  return (
    <Card>
      <SectionTitle>스윙 구조 (HH/HL)</SectionTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        fractal ±{leftRight}봉 · 라벨 {labeled.length}개
        {transitions.length > 0 && ` · 전환 ${transitions.length}회`}
        {" · 차트 표시는 사이드바"}
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

      <div className="mb-4 rounded-md border border-border bg-bg px-3 py-2.5 text-left">
        <p className="text-xs text-text-tertiary">
          라벨 연속 (반대 가족 LL·LH / HH·HL을 만나기 전)
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              streaks.active === "bullish"
                ? "positive"
                : streaks.active === "bearish"
                  ? "negative"
                  : "muted"
            }
          >
            {streaks.summary}
          </Badge>
        </div>
        <div className="mt-2 grid gap-1 text-xs text-text-tertiary sm:grid-cols-2">
          <p>
            HH/HL 현재 {streaks.bullish.current}연속
            {streaks.bullish.current > 0 && breakdownText("bullish")
              ? ` (${breakdownText("bullish")})`
              : ""}
            {" · "}최장 {streaks.bullish.max}
            {streaks.bullish.fromDate && streaks.bullish.current > 0
              ? ` · ${streaks.bullish.fromDate}~${streaks.bullish.toDate}`
              : ""}
          </p>
          <p>
            LL/LH 현재 {streaks.bearish.current}연속
            {streaks.bearish.current > 0 && breakdownText("bearish")
              ? ` (${breakdownText("bearish")})`
              : ""}
            {" · "}최장 {streaks.bearish.max}
            {streaks.bearish.fromDate && streaks.bearish.current > 0
              ? ` · ${streaks.bearish.fromDate}~${streaks.bearish.toDate}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-border bg-bg px-3 py-2.5 text-left">
        <p className="text-xs text-text-tertiary">
          구조 품질 (기울기 {quality.idealSlopeMinDeg}–{quality.idealSlopeMaxDeg}
          ° 적정 · ATR{quality.atrPeriod})
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={qualityGradeVariant(q.grade)}>품질 {q.grade}</Badge>
          <Badge variant={slopeVariant(q.slopeBand)}>
            {slopeBandLabel(q.slopeBand)}
          </Badge>
          {q.slopeDegrees != null && (
            <span className="text-xs tabular-nums text-text-tertiary">
              {q.slopeDegrees.toFixed(1)}°
            </span>
          )}
          <span className="text-sm text-text-secondary">{q.summary}</span>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          점수 {q.score}
          {q.widthAtr != null && ` · 폭 ${q.widthAtr.toFixed(2)} ATR`}
          {q.volumeRatio != null && ` · 거래량 ${q.volumeRatio.toFixed(2)}×`}
        </p>
        {q.caution && (
          <p className="mt-2 text-xs leading-relaxed text-negative">{q.caution}</p>
        )}
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

      <div className="mb-4 text-left">
        <p className="text-xs font-medium text-text-secondary">최근 파동 품질</p>
        {!quality.legs.length ? (
          <p className="mt-1 text-sm text-text-tertiary">없음</p>
        ) : (
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-sm">
            {[...quality.legs].reverse().slice(0, 10).map((leg) => (
              <li
                key={`${leg.fromBarIndex}-${leg.toBarIndex}`}
                className="flex flex-wrap items-center gap-2 text-text-secondary"
              >
                <span className="tabular-nums text-text-tertiary">
                  {leg.fromDate}→{leg.toDate}
                </span>
                <Badge variant={qualityGradeVariant(leg.grade)}>
                  {leg.grade}
                </Badge>
                <Badge variant={slopeVariant(leg.slopeBand)}>
                  {leg.slopeDegrees.toFixed(0)}°
                </Badge>
                <span className="text-xs text-text-tertiary">
                  폭 {leg.widthAtr.toFixed(1)}ATR · vol {leg.volumeRatio.toFixed(2)}
                  ×{leg.overheated ? " · 과열" : ""}
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
