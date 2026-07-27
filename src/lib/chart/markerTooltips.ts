import type { TrendLabel } from "@/lib/types";
import type { StrategyConfluence } from "@/lib/evaluation/strategyConfluence";

export interface MarkerTooltip {
  title: string;
  /** Short lines under the title (direction, summary, …). */
  lines: string[];
}

type StrategyHitLike = {
  id: string;
  label: string;
  barIndex: number;
  direction: TrendLabel;
  summary: string;
  date: string;
  instanceKey?: string;
};

function dirLabel(direction: TrendLabel): string {
  if (direction === "bullish") return "롱";
  if (direction === "bearish") return "숏";
  return "중립";
}

function putHit(
  map: Map<string, MarkerTooltip>,
  markerId: string,
  familyKo: string,
  hit: StrategyHitLike,
): void {
  map.set(markerId, {
    title: hit.label,
    lines: [`${familyKo} · ${dirLabel(hit.direction)}`, hit.summary].filter(
      Boolean,
    ),
  });
}

function addFamilyHits(
  map: Map<string, MarkerTooltip>,
  prefix: string,
  familyKo: string,
  hits: StrategyHitLike[] | undefined,
  visibility: Record<string, boolean> | undefined,
  idFn: (hit: StrategyHitLike) => string = (h) =>
    `${prefix}-${h.id}-${h.barIndex}`,
): void {
  if (!hits?.length) return;
  for (const hit of hits) {
    if (visibility && !visibility[hit.id]) continue;
    putHit(map, idFn(hit), familyKo, hit);
  }
}

/** Build marker-id → tooltip copy for strategy / confluence arrows. */
export function buildStrategyMarkerTooltips(input: {
  bb?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  rsi?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  macd?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  stoch?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  volume?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  combo?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  ichimoku?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  pattern?: { hits?: StrategyHitLike[]; visibility?: Record<string, boolean> };
  confluences?: StrategyConfluence[] | null;
  showConfluence?: boolean;
}): Map<string, MarkerTooltip> {
  const map = new Map<string, MarkerTooltip>();

  addFamilyHits(map, "bbstrat", "볼린저", input.bb?.hits, input.bb?.visibility);
  addFamilyHits(map, "rsistrat", "RSI", input.rsi?.hits, input.rsi?.visibility);
  addFamilyHits(
    map,
    "macdstrat",
    "MACD",
    input.macd?.hits,
    input.macd?.visibility,
  );
  addFamilyHits(
    map,
    "stochstrat",
    "스토캐",
    input.stoch?.hits,
    input.stoch?.visibility,
  );
  addFamilyHits(
    map,
    "volstrat",
    "거래량",
    input.volume?.hits,
    input.volume?.visibility,
  );
  addFamilyHits(
    map,
    "combostrat",
    "복합",
    input.combo?.hits,
    input.combo?.visibility,
  );
  addFamilyHits(
    map,
    "ichistrat",
    "일목",
    input.ichimoku?.hits,
    input.ichimoku?.visibility,
  );
  addFamilyHits(
    map,
    "pstrat",
    "패턴",
    input.pattern?.hits,
    input.pattern?.visibility,
    (h) => `pstrat-${h.id}-${h.instanceKey ?? h.id}-${h.barIndex}`,
  );

  if (input.showConfluence && input.confluences?.length) {
    for (const c of input.confluences.slice(-30)) {
      const names = c.hits.map((h) => h.label).join(", ");
      map.set(`sconf-${c.barIndex}-${c.direction}`, {
        title: `전략 겹침 ×${c.hits.length}`,
        lines: [dirLabel(c.direction), names],
      });
    }
  }

  return map;
}
