import type { SeriesMarker, Time } from "lightweight-charts";
import type { TradeJournalEntry } from "@/lib/tradeJournalStore";

/** Buy / sell markers for manual journal entries. */
export function tradeJournalToChartMarkers(
  entries: TradeJournalEntry[] | undefined | null,
): SeriesMarker<Time>[] {
  if (!entries?.length) return [];
  return entries.map((e) => {
    const buy = e.side === "buy";
    return {
      time: e.date as Time,
      position: buy ? "belowBar" : "aboveBar",
      color: buy ? "#22c55e" : "#ef4444",
      shape: buy ? "arrowUp" : "arrowDown",
      text: buy ? "매수" : "매도",
      id: `journal-${e.id}`,
    } as SeriesMarker<Time>;
  });
}
