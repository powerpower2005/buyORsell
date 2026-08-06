import type { ReactNode } from "react";
import {
  formatRewardRisk,
  methodLabelKo,
  type RiskRewardPlan,
} from "@/lib/evaluation/riskReward";
import type { SrZone } from "@/lib/evaluation/supportResistance";
import type { Trendline, TrendlineResult } from "@/lib/evaluation/trendlines";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";
import { SR_ZONE_COLORS } from "@/lib/chart/srZoneOverlay";
import { TRENDLINE_COLORS } from "@/lib/trendlineStore";
import {
  FIB_CONFLUENCE_COLOR,
  fibLevelLabel,
  type FibConfluenceHit,
} from "@/lib/fibonacciStore";
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";

export type SignalHitItem = {
  key: string;
  text: string;
  detail: string;
  color: string;
};

export type SignalKeyLabelItem = {
  text: string;
  label: string;
};

export type SignalSummaryProps = {
  patternHitLegend: SignalHitItem[];
  patternLegend: SignalKeyLabelItem[];
  structureHitLegend: SignalHitItem[];
  structureLegend: SignalKeyLabelItem[];
  elliottWaveLegend: SignalHitItem[];
  bbStrategyHitLegend: SignalHitItem[];
  bbStrategyLegend: SignalKeyLabelItem[];
  classicalHitLegend: SignalHitItem[];
  classicalPatternLegend: SignalKeyLabelItem[];
  patternStrategyHitLegend: SignalHitItem[];
  patternStrategyLegend: SignalKeyLabelItem[];
  rsiStrategyHitLegend: SignalHitItem[];
  rsiStrategyLegend: SignalKeyLabelItem[];
  volumeStrategyHitLegend: SignalHitItem[];
  volumeStrategyLegend: SignalKeyLabelItem[];
  comboStrategyHitLegend: SignalHitItem[];
  comboStrategyLegend: SignalKeyLabelItem[];
  macdStrategyHitLegend: SignalHitItem[];
  macdStrategyLegend: SignalKeyLabelItem[];
  classicStrategyHitLegend: SignalHitItem[];
  classicStrategyLegend: SignalKeyLabelItem[];
  stochStrategyHitLegend: SignalHitItem[];
  stochStrategyLegend: SignalKeyLabelItem[];
  ichimokuStrategyHitLegend: SignalHitItem[];
  ichimokuStrategyLegend: SignalKeyLabelItem[];
  visibleTrendlines: Trendline[];
  trendlines: TrendlineResult | undefined;
  chartTrendlineColors: Record<string, string> | undefined;
  srZones: SrZone[];
  journalEntries: TradeJournalEntry[] | undefined;
  showStrategyConfluence: boolean;
  strategyConfluences: StrategyConfluence[] | undefined;
  showRiskReward: boolean;
  riskRewardPlans: RiskRewardPlan[];
  fibConfluences: FibConfluenceHit[];
};

function groupSize(
  hits: SignalHitItem[],
  fallback: SignalKeyLabelItem[],
): number {
  if (hits.length > 0) return hits.length;
  if (fallback.length > 0) return fallback.length;
  return 0;
}

function HitRow({ item }: { item: SignalHitItem }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="font-mono text-[10px] font-semibold"
        style={{ color: item.color }}
      >
        {item.text}
      </span>
      <span className="tabular-nums text-text-secondary">{item.detail}</span>
    </span>
  );
}

function HitRowEmphasized({ item }: { item: SignalHitItem }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="font-mono text-[10px] font-semibold"
        style={{ color: item.color }}
      >
        {item.text}
      </span>
      <span
        className="tabular-nums text-[11px] font-semibold"
        style={{ color: item.color }}
      >
        {item.detail}
      </span>
    </span>
  );
}

function FallbackLabels({ items }: { items: SignalKeyLabelItem[] }) {
  return (
    <>
      {items.map((item) => (
        <span
          key={`${item.text}-${item.label}`}
          className="text-text-secondary"
        >
          {item.label}
        </span>
      ))}
    </>
  );
}

function GroupRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="text-text-tertiary">{label}</span>
      {children}
    </div>
  );
}

/** Collapsible signal / strategy hit summary below the chart legend. */
export function SignalSummary({
  patternHitLegend,
  patternLegend,
  structureHitLegend,
  structureLegend,
  elliottWaveLegend,
  bbStrategyHitLegend,
  bbStrategyLegend,
  classicalHitLegend,
  classicalPatternLegend,
  patternStrategyHitLegend,
  patternStrategyLegend,
  rsiStrategyHitLegend,
  rsiStrategyLegend,
  volumeStrategyHitLegend,
  volumeStrategyLegend,
  comboStrategyHitLegend,
  comboStrategyLegend,
  macdStrategyHitLegend,
  macdStrategyLegend,
  classicStrategyHitLegend,
  classicStrategyLegend,
  stochStrategyHitLegend,
  stochStrategyLegend,
  ichimokuStrategyHitLegend,
  ichimokuStrategyLegend,
  visibleTrendlines,
  trendlines,
  chartTrendlineColors,
  srZones,
  journalEntries,
  showStrategyConfluence,
  strategyConfluences,
  showRiskReward,
  riskRewardPlans,
  fibConfluences,
}: SignalSummaryProps) {
  const journalCount = journalEntries?.length ?? 0;
  const confluenceCount =
    showStrategyConfluence && strategyConfluences?.length
      ? strategyConfluences.length
      : 0;
  const rrCount = showRiskReward ? riskRewardPlans.length : 0;

  const sizes = [
    groupSize(patternHitLegend, patternLegend),
    groupSize(structureHitLegend, structureLegend),
    elliottWaveLegend.length,
    groupSize(bbStrategyHitLegend, bbStrategyLegend),
    groupSize(classicalHitLegend, classicalPatternLegend),
    groupSize(patternStrategyHitLegend, patternStrategyLegend),
    groupSize(rsiStrategyHitLegend, rsiStrategyLegend),
    groupSize(volumeStrategyHitLegend, volumeStrategyLegend),
    groupSize(comboStrategyHitLegend, comboStrategyLegend),
    groupSize(macdStrategyHitLegend, macdStrategyLegend),
    groupSize(classicStrategyHitLegend, classicStrategyLegend),
    groupSize(stochStrategyHitLegend, stochStrategyLegend),
    groupSize(ichimokuStrategyHitLegend, ichimokuStrategyLegend),
    visibleTrendlines.length,
    srZones.length,
    journalCount,
    confluenceCount,
    rrCount,
    fibConfluences.length,
  ];
  const groupCount = sizes.filter((n) => n > 0).length;
  const itemCount = sizes.reduce((a, b) => a + b, 0);

  if (groupCount === 0) return null;

  const showPatternHits = patternHitLegend.length > 0;
  const showPatternFallback =
    !showPatternHits && patternLegend.length > 0;
  const showStructureHits = structureHitLegend.length > 0;
  const showStructureFallback =
    !showStructureHits && structureLegend.length > 0;
  const showBbHits = bbStrategyHitLegend.length > 0;
  const showBbFallback = !showBbHits && bbStrategyLegend.length > 0;
  const showClassicalHits = classicalHitLegend.length > 0;
  const showClassicalFallback =
    !showClassicalHits && classicalPatternLegend.length > 0;
  const showPatternStrategyHits = patternStrategyHitLegend.length > 0;
  const showPatternStrategyFallback =
    !showPatternStrategyHits && patternStrategyLegend.length > 0;
  const showRsiHits = rsiStrategyHitLegend.length > 0;
  const showRsiFallback = !showRsiHits && rsiStrategyLegend.length > 0;
  const showVolumeHits = volumeStrategyHitLegend.length > 0;
  const showVolumeFallback =
    !showVolumeHits && volumeStrategyLegend.length > 0;
  const showComboHits = comboStrategyHitLegend.length > 0;
  const showComboFallback =
    !showComboHits && comboStrategyLegend.length > 0;
  const showMacdHits = macdStrategyHitLegend.length > 0;
  const showMacdFallback =
    !showMacdHits && macdStrategyLegend.length > 0;
  const showClassicHits = classicStrategyHitLegend.length > 0;
  const showClassicFallback =
    !showClassicHits && classicStrategyLegend.length > 0;
  const showStochHits = stochStrategyHitLegend.length > 0;
  const showStochFallback =
    !showStochHits && stochStrategyLegend.length > 0;
  const showIchimokuHits = ichimokuStrategyHitLegend.length > 0;
  const showIchimokuFallback =
    !showIchimokuHits && ichimokuStrategyLegend.length > 0;

  return (
    <details className="text-xs">
      <summary className="cursor-pointer list-none rounded-sm text-text-secondary marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg [&::-webkit-details-marker]:hidden">
        신호 집계 · {groupCount}개 그룹 {itemCount}건
      </summary>
      <div className="mt-2 space-y-2">
        {showPatternHits ? (
          <GroupRow label={`캔들 패턴 (${patternHitLegend.length}):`}>
            {patternHitLegend.map((item) => (
              <HitRowEmphasized key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showPatternFallback && (
            <GroupRow label="캔들 패턴:">
              {patternLegend.map((item) => (
                <span key={item.text} className="text-text-secondary">
                  {item.label}
                </span>
              ))}
            </GroupRow>
          )
        )}

        {showStructureHits ? (
          <GroupRow label="스윙 구조:">
            {structureHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showStructureFallback && (
            <GroupRow label="스윙 구조:">
              {structureLegend.map((item) => (
                <span key={item.text} className="text-text-secondary">
                  {item.label}
                </span>
              ))}
            </GroupRow>
          )
        )}

        {elliottWaveLegend.length > 0 && (
          <GroupRow label="엘리어트 파동:">
            {elliottWaveLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        )}

        {showBbHits ? (
          <GroupRow label="BB 전략:">
            {bbStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showBbFallback && (
            <GroupRow label="BB 전략:">
              <FallbackLabels items={bbStrategyLegend} />
            </GroupRow>
          )
        )}

        {showClassicalHits ? (
          <GroupRow label="차트 패턴:">
            {classicalHitLegend.map((item) => {
              const datePart = item.detail.split(" · ")[0] ?? item.detail;
              const rest = item.detail.includes(" · ")
                ? item.detail.slice(datePart.length)
                : "";
              return (
                <span key={item.key} className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </span>
                  <span
                    className="tabular-nums text-[11px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {datePart}
                  </span>
                  {rest && (
                    <span className="tabular-nums text-text-secondary">
                      {rest}
                    </span>
                  )}
                </span>
              );
            })}
          </GroupRow>
        ) : (
          showClassicalFallback && (
            <GroupRow label="차트 패턴:">
              <FallbackLabels items={classicalPatternLegend} />
            </GroupRow>
          )
        )}

        {showPatternStrategyHits ? (
          <GroupRow label="패턴 전략:">
            {patternStrategyHitLegend.map((item) => (
              <HitRowEmphasized key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showPatternStrategyFallback && (
            <GroupRow label="패턴 전략:">
              <FallbackLabels items={patternStrategyLegend} />
            </GroupRow>
          )
        )}

        {showRsiHits ? (
          <GroupRow label="RSI 전략:">
            {rsiStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showRsiFallback && (
            <GroupRow label="RSI 전략:">
              <FallbackLabels items={rsiStrategyLegend} />
            </GroupRow>
          )
        )}

        {showVolumeHits ? (
          <GroupRow label="거래량 전략:">
            {volumeStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showVolumeFallback && (
            <GroupRow label="거래량 전략:">
              <FallbackLabels items={volumeStrategyLegend} />
            </GroupRow>
          )
        )}

        {showComboHits ? (
          <GroupRow label="복합 전략:">
            {comboStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showComboFallback && (
            <GroupRow label="복합 전략:">
              <FallbackLabels items={comboStrategyLegend} />
            </GroupRow>
          )
        )}

        {showMacdHits ? (
          <GroupRow label="MACD 전략:">
            {macdStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showMacdFallback && (
            <GroupRow label="MACD 전략:">
              <FallbackLabels items={macdStrategyLegend} />
            </GroupRow>
          )
        )}

        {showClassicHits ? (
          <GroupRow label="고전 이론:">
            {classicStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showClassicFallback && (
            <GroupRow label="고전 이론:">
              <FallbackLabels items={classicStrategyLegend} />
            </GroupRow>
          )
        )}

        {showStochHits ? (
          <GroupRow label="스토캐 전략:">
            {stochStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showStochFallback && (
            <GroupRow label="스토캐 전략:">
              <FallbackLabels items={stochStrategyLegend} />
            </GroupRow>
          )
        )}

        {showIchimokuHits ? (
          <GroupRow label="일목 전략:">
            {ichimokuStrategyHitLegend.map((item) => (
              <HitRow key={item.key} item={item} />
            ))}
          </GroupRow>
        ) : (
          showIchimokuFallback && (
            <GroupRow label="일목 전략:">
              <FallbackLabels items={ichimokuStrategyLegend} />
            </GroupRow>
          )
        )}

        {visibleTrendlines.length > 0 && (
          <GroupRow label={`동적 추세선 (${visibleTrendlines.length}):`}>
            {visibleTrendlines.map((line) => {
              const siblings =
                line.kind === "ascending"
                  ? (trendlines?.ascending ?? [])
                  : (trendlines?.descending ?? []);
              const index = siblings.findIndex((l) => l.id === line.id);
              const color =
                chartTrendlineColors?.[line.id] ??
                TRENDLINE_COLORS[line.kind];
              return (
                <span key={line.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="tabular-nums text-text-secondary">
                    {line.kind === "ascending" ? "↑" : "↓"}
                    {index >= 0 ? ` #${index + 1}` : ""} · 터치{" "}
                    {line.touches} · 점수 {line.score}
                    {line.broken ? " · 이탈" : ""}
                  </span>
                </span>
              );
            })}
          </GroupRow>
        )}

        {srZones.length > 0 && (
          <GroupRow label={`지지·저항 가격대 (${srZones.length}):`}>
            {srZones.map((z) => (
              <span key={z.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-4 rounded-sm"
                  style={{ backgroundColor: SR_ZONE_COLORS[z.kind].stroke }}
                />
                <span className="tabular-nums text-text-secondary">
                  {z.kind === "support" ? "S" : "R"}×{z.quality.touchEvents}{" "}
                  {z.low.toFixed(2)}–{z.high.toFixed(2)} ({z.quality.grade})
                </span>
              </span>
            ))}
          </GroupRow>
        )}

        {journalCount > 0 && journalEntries && (
          <GroupRow label={`매매 기록 (${journalCount}):`}>
            {journalEntries.slice(-8).map((e) => (
              <span key={e.id} className="tabular-nums text-text-secondary">
                <span
                  className={
                    e.side === "buy" ? "text-positive" : "text-negative"
                  }
                >
                  {e.side === "buy" ? "매수" : "매도"}
                </span>{" "}
                {e.date} {e.price}
              </span>
            ))}
          </GroupRow>
        )}

        {confluenceCount > 0 && strategyConfluences && (
          <GroupRow label={`전략 겹침 (${confluenceCount}):`}>
            {strategyConfluences.slice(-8).map((c) => (
              <span
                key={`${c.barIndex}-${c.direction}`}
                className="tabular-nums text-text-secondary"
              >
                {c.date} ×{c.hits.length}{" "}
                {c.direction === "bullish" ? "↑" : "↓"} (
                {c.hits.map((h) => h.label).join(", ")})
              </span>
            ))}
          </GroupRow>
        )}

        {rrCount > 0 && (
          <GroupRow label={`손익비 v1 (${rrCount}):`}>
            {riskRewardPlans.map((p) => (
              <span key={p.key} className="tabular-nums text-text-secondary">
                <span
                  className={
                    p.direction === "bullish"
                      ? "text-positive"
                      : "text-negative"
                  }
                >
                  {formatRewardRisk(p.rewardRisk)}
                </span>{" "}
                {p.label} · {methodLabelKo(p.method)} · 손절{" "}
                {p.stopPrice.toFixed(2)} · 목표 {p.targetPrice.toFixed(2)}
              </span>
            ))}
          </GroupRow>
        )}

        {fibConfluences.length > 0 && (
          <GroupRow label="Confluence (피보+지지·저항):">
            {fibConfluences.map((hit, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-4 rounded-sm"
                  style={{ backgroundColor: FIB_CONFLUENCE_COLOR }}
                />
                <span className="tabular-nums text-text-secondary">
                  {fibLevelLabel(hit.ratio)} +{" "}
                  {hit.zoneKind === "support" ? "S" : "R"}{" "}
                  {hit.fibPrice.toFixed(2)}
                </span>
              </span>
            ))}
          </GroupRow>
        )}
      </div>
    </details>
  );
}
