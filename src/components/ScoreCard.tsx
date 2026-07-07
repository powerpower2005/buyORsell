import { Card, SectionTitle } from "./ui/Card";
import type { ScoreResult } from "@/lib/types";

export function ScoreCard({ score }: { score: ScoreResult }) {
  return (
    <Card>
      <SectionTitle>종합 점수</SectionTitle>
      <div className="flex items-end gap-4 text-left">
        <span className="tabular-nums text-5xl font-bold">{score.value}</span>
        <span className="mb-2 text-2xl font-semibold text-accent">{score.grade}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {score.breakdown.map((b) => (
          <li key={b.name} className="flex justify-between text-sm">
            <span className="text-text-secondary">{b.name}</span>
            <span className="tabular-nums text-text-primary">
              {b.score} × {Math.round(b.weight * 100)}% = {b.weighted}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
