import { HelpTip } from "./HelpTip";
import { Card } from "./ui/Card";
import type { HelpContent } from "@/lib/indicatorHelp";
import type { ScoreResult, Timeframe } from "@/lib/types";

const CATEGORY_META: Record<
  string,
  { labelKo: string; how: string }
> = {
  trend: {
    labelKo: "추세",
    how: "종가가 SMA50·SMA200(일봉) / SMA50(주봉) 위면 가점. 중·장기 이평 위 강세 여부를 봅니다.",
  },
  momentum: {
    labelKo: "모멘텀",
    how: "RSI가 중립 구간이면 만점, 과매도는 감점 적게·과매수는 많이. MACD 히스토그램이 양수면 가점(일봉).",
  },
  volatility: {
    labelKo: "변동성(밴드)",
    how: "볼린저 안 위치로 채점. 하단 근처↑, 중간, 상단(과열)↓ — 과열보다 눌림을 높게 줍니다.",
  },
  volume: {
    labelKo: "거래량",
    how: "최근 거래량이 20일 평균 이상이면 만점, 미만이면 절반. 참여 강도를 봅니다.",
  },
  range: {
    labelKo: "가격 위치",
    how: "최근 고저 구간(일봉 약 1년·주봉 52주)에서 종가 위치. 고점에 가까울수록 점수↑.",
  },
};

const SCORE_HELP: HelpContent = {
  title: "종합 점수 산정",
  summary:
    "차트에 켠 전략·보조지표와 무관합니다. OHLCV만으로 SMA·RSI·MACD·볼린저 등을 다시 계산해 규칙 점수를 매깁니다.",
  howToFind:
    "각 카테고리 규칙 점수를 0~100으로 정규화한 뒤 가중치를 곱하고, 활성 카테고리만으로 다시 나눠 가중 평균합니다. 표시의「80 × 30% = 24」는 카테고리 80점 × 가중치 30% → 기여분 24입니다.",
  higher:
    "일봉 가중치: 추세 30% · 모멘텀 25% · 밴드 15% · 거래량 15% · 가격위치 15%. 주봉: 추세 40% · 모멘텀 35% · 가격위치 25%.",
  higherLabel: "가중치",
    lower:
      "A≥80, B≥65, C≥50, D≥35, F<35. 데이터 부족으로 규칙이 스킵되면 그 가중치는 제외됩니다.",
  lowerLabel: "등급",
  tip: "가격 위치(range)는 고점일수록 높아져 ‘싸게 사자’보다 강세·위치 우세에 가깝습니다. 전략 마커 성공률(%)과는 별개입니다.",
};

function categoryMeta(name: string) {
  return (
    CATEGORY_META[name] ?? {
      labelKo: name,
      how: "설정(scoring.json) 규칙으로 채점합니다.",
    }
  );
}

interface Props {
  score: ScoreResult;
  timeframe?: Timeframe;
}

export function ScoreCard({ score, timeframe }: Props) {
  const presetHint =
    timeframe === "1w"
      ? "주봉 프리셋(1w_swing)"
      : timeframe === "1d"
        ? "일봉 프리셋(1d_default)"
        : null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-left text-lg font-semibold text-text-primary">
          종합 점수
        </h2>
        <HelpTip help={SCORE_HELP} label="종합 점수 산정 도움말" />
      </div>
      <div className="flex items-end gap-4 text-left">
        <span className="tabular-nums text-5xl font-bold">{score.value}</span>
        <span className="mb-2 text-2xl font-semibold text-accent">
          {score.grade}
        </span>
      </div>
      {presetHint && (
        <p className="mt-1 text-[11px] text-text-tertiary">{presetHint}</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">
        부분점수를 가중 평균한 값입니다. 각 항목의 「점수 × 비중 = 기여」를
        더한 뒤, 활성 비중 합으로 나눕니다.
      </p>
      <ul className="mt-4 space-y-3">
        {score.breakdown.map((b) => {
          const meta = categoryMeta(b.name);
          return (
            <li key={b.name} className="text-left text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-text-primary">
                  {meta.labelKo}
                  <span className="ml-1.5 font-normal text-text-tertiary">
                    ({b.name})
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-text-primary">
                  {b.score} × {Math.round(b.weight * 100)}% = {b.weighted}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-text-tertiary">
                {meta.how}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
