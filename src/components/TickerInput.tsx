import { useMemo } from "react";
import { EXAMPLE_TICKERS, parseTickerInput } from "@/lib/urlParser";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function TickerInput({ value, onChange, onSubmit, disabled }: Props) {
  const parsed = useMemo(() => parseTickerInput(value), [value]);

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">1. 종목 입력</h2>
      <Input
        placeholder="NVDA:NASDAQ (티커:거래소)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && parsed.valid && !disabled && onSubmit()}
      />
      <p
        className={`text-sm ${parsed.valid ? "text-positive" : value ? "text-negative" : "text-text-secondary"}`}
      >
        {parsed.hint}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => onChange("NVDA:NASDAQ")}>
          예시 NVDA:NASDAQ
        </Button>
        {EXAMPLE_TICKERS.map((t) => (
          <button
            key={t}
            type="button"
            className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-accent hover:text-text-primary"
            onClick={() => onChange(t)}
          >
            {t}
          </button>
        ))}
      </div>
    </Card>
  );
}
