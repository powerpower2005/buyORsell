import { Card } from "./ui/Card";

interface Props {
  warnings: string[];
}

export function PartialDataBanner({ warnings }: Props) {
  if (!warnings.length) return null;

  return (
    <Card className="border-accent/40 bg-accent/10">
      <p className="text-left text-sm font-semibold text-accent">
        일부 지표·점수 항목을 계산하지 못함
      </p>
      <p className="mt-1 text-left text-sm text-text-secondary">
        아래 항목은 봉 수 부족 등으로 차트/점수에서 제외됩니다. 가능한 지표는
        그대로 표시합니다.
      </p>
      <ul className="mt-3 space-y-1 rounded-md bg-bg px-3 py-2 text-xs text-text-secondary">
        {warnings.map((w) => (
          <li key={w} className="leading-relaxed">
            {w}
          </li>
        ))}
      </ul>
    </Card>
  );
}
