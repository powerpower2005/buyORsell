import { useMemo } from "react";
import { EXAMPLE_TICKERS, parseTickerInput } from "@/lib/urlParser";
import { Input } from "./ui/Input";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function TickerInput({ value, onChange }: Props) {
  const parsed = useMemo(() => parseTickerInput(value), [value]);

  return (
    <div className="space-y-3 text-left">
      <Input
        placeholder="NVDA:NASDAQ (티커:거래소)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p
        className={`text-sm ${parsed.valid ? "text-positive" : value ? "text-negative" : "text-text-secondary"}`}
      >
        {parsed.hint}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary hover:border-accent hover:text-text-primary"
          onClick={() => onChange("NVDA:NASDAQ")}
        >
          NVDA:NASDAQ
        </button>
        {EXAMPLE_TICKERS.filter((t) => t !== "NVDA:NASDAQ").map((t) => (
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
    </div>
  );
}
