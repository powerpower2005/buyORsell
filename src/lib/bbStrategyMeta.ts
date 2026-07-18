import type { TrendLabel } from "./types";

export type BbStrategyId =
  | "band_sr"
  | "band_breakout"
  | "squeeze"
  | "trend_follow"
  | "divergence";

export const BB_STRATEGY_ORDER: BbStrategyId[] = [
  "band_sr",
  "band_breakout",
  "squeeze",
  "trend_follow",
  "divergence",
];

export const BB_STRATEGY_META: Record<
  BbStrategyId,
  {
    label: string;
    labelKo: string;
    description: string;
    markerBull: string;
    markerBear: string;
    typicalDirection: TrendLabel;
  }
> = {
  band_sr: {
    label: "Band support/resistance",
    labelKo: "밴드 지지·저항",
    description:
      "횡보 구간에서 하단 터치 매수·상단 터치 매도. 익절은 반대 밴드, 손절은 진입가 밖.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
  band_breakout: {
    label: "Band breakout",
    labelKo: "밴드 돌파",
    description:
      "추세장에서 같은 방향 두 번째 밴드 돌파 시 진입. 익절 길게, 손절 짧게.",
    markerBull: "BO↑",
    markerBear: "BO↓",
    typicalDirection: "neutral",
  },
  squeeze: {
    label: "Squeeze breakout",
    labelKo: "스퀴즈",
    description:
      "밴드 폭 축소 후 상·하단 돌파 방향으로 진입. 헤드페이크 주의, 손절 필수.",
    markerBull: "SQ↑",
    markerBear: "SQ↓",
    typicalDirection: "neutral",
  },
  trend_follow: {
    label: "Trend follow (%B+MFI)",
    labelKo: "추세 추종",
    description:
      "상승: %B≥0.8·MFI≥80 / 하락: %B<0.2·MFI<20 조건에서 추세 방향 진입.",
    markerBull: "TF↑",
    markerBear: "TF↓",
    typicalDirection: "neutral",
  },
  divergence: {
    label: "BB–RSI divergence",
    labelKo: "다이버전스",
    description:
      "밴드 터치와 RSI 다이버전스 후 중심선 돌파 시 진입. R:R 2:1, 밴드 재돌파 손절.",
    markerBull: "DV↑",
    markerBear: "DV↓",
    typicalDirection: "neutral",
  },
};

export function bbStrategyMarkerText(
  id: BbStrategyId,
  direction: TrendLabel,
): string {
  const meta = BB_STRATEGY_META[id];
  if (direction === "bearish") return meta.markerBear;
  return meta.markerBull;
}
