import { Card } from "./ui/Card";

interface Props {
  warnings: string[];
}

export function PartialDataBanner({ warnings }: Props) {
  if (!warnings.length) return null;

  return (
    <Card className="border-accent/40 bg-accent/10">
      <p className="text-left text-sm font-semibold text-accent">
        일부 지표·점수 항목은 봉 수 부족으로 제외됨
      </p>
      <p className="mt-1 text-left text-sm text-text-secondary">
        차트와 계산 가능한 지표는 그대로 표시합니다. 더 긴 lookback이 필요한 항목만
        건너뜁니다.
      </p>
      <ul className="mt-3 space-y-1 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-tertiary">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </Card>
  );
}
