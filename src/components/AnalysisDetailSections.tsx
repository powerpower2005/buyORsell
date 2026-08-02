import { AnalysisSection } from "./AnalysisSection";
import { ScoreCard } from "./ScoreCard";
import { MTFAlignmentCard } from "./MTFAlignmentCard";
import { SwingStructurePanel } from "./SwingStructurePanel";
import { SupportResistancePanel } from "./SupportResistancePanel";
import { CandlePatternPanel } from "./CandlePatternPanel";
import { IndicatorPanel } from "./IndicatorPanel";
import { VolumePanel } from "./VolumePanel";
import { TradeJournalPanel } from "./TradeJournalPanel";
import { StrategyBuilder } from "./StrategyBuilder";
import { ExportPanel } from "./ExportPanel";
import { structureRegimeLabel } from "@/lib/evaluation/swingStructure";
import type { QuoteEvaluation } from "@/lib/evaluation/evaluateQuote";
import type {
  BacktestResult,
  QuoteFile,
  Timeframe,
} from "@/lib/types";

interface Props {
  evaluation: QuoteEvaluation;
  ticker: string;
  timeframe: Timeframe;
  journalTick: number;
  onJournalChange: () => void;
  onPatternVisibilityChange: () => void;
  onBacktestResult: (r: BacktestResult) => void;
  /** When set, Export panel is included under 기록·도구 (Home). */
  exportQuote?: QuoteFile | null;
  backtest?: BacktestResult;
}

function overviewSummary(evaluation: QuoteEvaluation): string {
  const parts: string[] = [];
  if (evaluation.score) {
    parts.push(`${evaluation.score.value} · ${evaluation.score.grade}`);
  }
  if (evaluation.mtf.enabled) {
    parts.push(`MTF ${evaluation.mtf.alignmentPct}%`);
  }
  return parts.join(" · ") || "점수·정렬";
}

function structureSummary(evaluation: QuoteEvaluation): string {
  const parts: string[] = [];
  if (evaluation.structure) {
    parts.push(structureRegimeLabel(evaluation.structure.current.regime));
  }
  if (evaluation.supportResistance) {
    parts.push(`존 ${evaluation.supportResistance.zones.length}`);
  }
  return parts.join(" · ") || "구조·레벨";
}

function patternsSummary(evaluation: QuoteEvaluation): string {
  const p = evaluation.patterns;
  if (!p) return "패턴 없음";
  const latest = p.onLatestBar.length;
  const recent = p.recent.length;
  if (latest > 0) return `최근 봉 ${latest} · 구간 ${recent}`;
  return recent > 0 ? `구간 ${recent}` : "감지 없음";
}

function indicatorsSummary(evaluation: QuoteEvaluation): string {
  const active = evaluation.indicators.signals.filter((s) => s.active).length;
  const vol = evaluation.volume.currentVolume;
  const parts: string[] = [];
  if (active > 0) parts.push(`신호 ${active}`);
  if (vol > 0) parts.push("거래량");
  return parts.join(" · ") || "지표·거래량";
}

export function AnalysisDetailSections({
  evaluation,
  ticker,
  timeframe,
  journalTick,
  onJournalChange,
  onPatternVisibilityChange,
  onBacktestResult,
  exportQuote,
  backtest,
}: Props) {
  return (
    <div className="space-y-3">
      <AnalysisSection
        id="overview"
        title="한눈에"
        summary={overviewSummary(evaluation)}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {evaluation.score && (
            <ScoreCard score={evaluation.score} timeframe={timeframe} />
          )}
          <MTFAlignmentCard alignment={evaluation.mtf} />
        </div>
      </AnalysisSection>

      <AnalysisSection
        id="structure"
        title="구조·레벨"
        summary={structureSummary(evaluation)}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {evaluation.structure && (
            <SwingStructurePanel structure={evaluation.structure} />
          )}
          {evaluation.supportResistance && (
            <SupportResistancePanel sr={evaluation.supportResistance} />
          )}
          {!evaluation.structure && !evaluation.supportResistance && (
            <p className="text-sm text-text-tertiary">표시할 구조 데이터가 없습니다.</p>
          )}
        </div>
      </AnalysisSection>

      <AnalysisSection
        id="patterns"
        title="패턴"
        summary={patternsSummary(evaluation)}
      >
        {evaluation.patterns ? (
          <CandlePatternPanel
            patterns={evaluation.patterns}
            onVisibilityChange={onPatternVisibilityChange}
          />
        ) : (
          <p className="text-sm text-text-tertiary">감지된 캔들 패턴이 없습니다.</p>
        )}
      </AnalysisSection>

      <AnalysisSection
        id="indicators"
        title="지표·거래량"
        summary={indicatorsSummary(evaluation)}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <IndicatorPanel results={evaluation.indicators} />
          <VolumePanel snapshot={evaluation.volume} timeframe={timeframe} />
        </div>
      </AnalysisSection>

      <AnalysisSection id="tools" title="기록·도구" summary="매매기록 · 백테스트">
        <div className="space-y-4">
          <TradeJournalPanel
            ticker={ticker}
            timeframe={timeframe}
            bars={evaluation.bars}
            refreshTick={journalTick}
            onChange={onJournalChange}
          />
          <StrategyBuilder
            bars={evaluation.bars}
            evaluation={evaluation}
            onResult={onBacktestResult}
          />
          {exportQuote && (
            <ExportPanel
              quote={exportQuote}
              indicators={evaluation.indicators}
              score={evaluation.score ?? undefined}
              patterns={evaluation.patterns ?? undefined}
              backtest={backtest}
            />
          )}
        </div>
      </AnalysisSection>
    </div>
  );
}
