import { toPng } from "html-to-image";
import { useRef } from "react";
import { Card, SectionTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import type {
  QuoteFile,
  IndicatorResults,
  ScoreResult,
  BacktestResult,
} from "@/lib/types";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";

interface Props {
  quote: QuoteFile;
  indicators: IndicatorResults;
  score: ScoreResult;
  patterns?: CandlePatternResult;
  backtest?: BacktestResult;
  exportRootId?: string;
}

export function ExportPanel({
  quote,
  indicators,
  score,
  patterns,
  backtest,
  exportRootId = "export-root",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      quote: { ticker: quote.ticker, timeframe: quote.timeframe, barCount: quote.barCount },
      score,
      signals: indicators.signals,
      candlePatterns: patterns,
      backtest,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quote.ticker.replace(":", "-")}_${quote.timeframe}_${quote.lastBarDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    const el = document.getElementById(exportRootId);
    if (!el) return;
    const dataUrl = await toPng(el, { backgroundColor: "#191919" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${quote.ticker.replace(":", "-")}_chart.png`;
    a.click();
  };

  return (
    <Card>
      <SectionTitle>Export</SectionTitle>
      <div ref={ref} className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportJson}>
          JSON 내보내기
        </Button>
        <Button variant="secondary" onClick={exportPng}>
          PNG 캡처
        </Button>
      </div>
    </Card>
  );
}
