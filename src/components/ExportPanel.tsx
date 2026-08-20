import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, SectionTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type {
  QuoteFile,
  IndicatorResults,
  ScoreResult,
  BacktestResult,
} from "@/lib/types";
import type { CandlePatternResult } from "@/lib/evaluation/candlePatterns";
import {
  buildIndicatorYaml,
  defaultYamlRange,
} from "@/lib/exportIndicatorYaml";

interface Props {
  quote: QuoteFile;
  indicators: IndicatorResults;
  score?: ScoreResult;
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
  const defaults = useMemo(
    () => defaultYamlRange(quote.ohlcv, 20),
    [quote.ohlcv],
  );
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    setFrom(defaults.from);
    setTo(defaults.to);
    setCopyStatus(null);
  }, [defaults.from, defaults.to, quote.ticker, quote.timeframe]);

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

  const makeYaml = () =>
    buildIndicatorYaml(quote, indicators, {
      from: from || undefined,
      to: to || undefined,
    });

  const dumpYamlConsole = () => {
    const yaml = makeYaml();
    console.log(yaml);
    setCopyStatus("콘솔에 출력함");
  };

  const copyYaml = async () => {
    const yaml = makeYaml();
    console.log(yaml);
    try {
      await navigator.clipboard.writeText(yaml);
      setCopyStatus("클립보드에 복사함");
    } catch {
      setCopyStatus("복사 실패 · 콘솔만 출력");
    }
  };

  return (
    <Card>
      <SectionTitle>Export</SectionTitle>
      <div ref={ref} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportJson}>
            JSON 내보내기
          </Button>
          <Button variant="secondary" onClick={exportPng}>
            PNG 캡처
          </Button>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm text-text-secondary">
            지표 YAML (OHLCV + 켜진 지표 · 콘솔 출력)
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[9rem] flex-1 text-xs text-text-tertiary">
              From
              <Input
                type="date"
                className="mt-1 py-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="block min-w-[9rem] flex-1 text-xs text-text-tertiary">
              To
              <Input
                type="date"
                className="mt-1 py-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={dumpYamlConsole}>
              YAML 콘솔 출력
            </Button>
            <Button variant="secondary" onClick={copyYaml}>
              YAML 복사
            </Button>
            {copyStatus && (
              <span className="text-xs text-text-tertiary">{copyStatus}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
