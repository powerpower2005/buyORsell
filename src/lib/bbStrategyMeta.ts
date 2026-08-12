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
      "횡보일 때 아래 밴드를 건드리면 매수, 위 밴드를 건드리면 매도합니다. 익절은 반대 밴드, 손절은 진입가 밖입니다.",
    markerBull: "SR↑",
    markerBear: "SR↓",
    typicalDirection: "neutral",
  },
  band_breakout: {
    label: "Band breakout",
    labelKo: "밴드 돌파",
    description:
      "추세장에서 같은 방향으로 밴드를 두 번째 넘을 때 진입합니다. 익절은 길게, 손절은 짧게 잡습니다.",
    markerBull: "BO↑",
    markerBear: "BO↓",
    typicalDirection: "neutral",
  },
  squeeze: {
    label: "Squeeze breakout",
    labelKo: "스퀴즈",
    description:
      "밴드 폭이 좁아진 뒤 위·아래 중 어느 쪽으로 벗어나는지 따라 진입합니다. 허수 돌파에 주의하고 손절은 필수입니다.",
    markerBull: "SQ↑",
    markerBear: "SQ↓",
    typicalDirection: "neutral",
  },
  trend_follow: {
    label: "Trend follow (%B+MFI)",
    labelKo: "추세 추종",
    description:
      "상승: 가격이 위쪽 밴드 근처(%B 0.8 이상)이고 MFI도 높을 때 / 하락: 아래쪽 밴드 근처(%B 0.2 미만)이고 MFI도 낮을 때 추세 방향으로 진입합니다.",
    markerBull: "TF↑",
    markerBear: "TF↓",
    typicalDirection: "neutral",
  },
  divergence: {
    label: "BB–RSI divergence",
    labelKo: "다이버전스",
    description:
      "밴드를 건드리면서 RSI와 주가가 어긋난 뒤, 중심선을 넘을 때 진입합니다. 손익비 2:1, 밴드를 다시 넘기면 손절합니다.",
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
