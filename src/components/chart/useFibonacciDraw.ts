import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { OHLCVBar } from "@/lib/types";
import {
  getFibPendingLow,
  setFibDrawMode,
  setFibPendingLow,
  setFibRetracement,
  type FibAnchor,
  type FibRetracement,
} from "@/lib/fibonacciStore";

export type UseFibonacciDrawArgs = {
  fibDrawMode?: boolean;
  onFibChange?: () => void;
  barsRef: MutableRefObject<OHLCVBar[]>;
  drawChartOverlays: () => void;
};

/** Fibonacci draw-mode: pick low/high anchors via chart clicks + hint banner state. */
export function useFibonacciDraw({
  fibDrawMode,
  onFibChange,
  barsRef,
  drawChartOverlays,
}: UseFibonacciDrawArgs) {
  const fibDrawModeRef = useRef<boolean>(fibDrawMode ?? false);
  fibDrawModeRef.current = fibDrawMode ?? false;
  const onFibChangeRef = useRef<(() => void) | undefined>(onFibChange);
  onFibChangeRef.current = onFibChange;

  const [pickHint, setPickHint] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFibClick = (param: any) => {
    if (!fibDrawModeRef.current) return;
    if (!param.time) return;

    const timeStr = String(param.time);
    const barsData = barsRef.current;
    const barIdx = barsData.findIndex((b) => b.date === timeStr);
    if (barIdx < 0) return;
    const bar = barsData[barIdx];

    const pending = getFibPendingLow();
    if (!pending) {
      const anchor: FibAnchor = {
        date: bar.date,
        barIndex: barIdx,
        price: bar.low,
      };
      setFibPendingLow(anchor);
      setPickHint("피보나치: 고점(스윙 고) 캔들을 클릭하세요");
      drawChartOverlays();
    } else {
      if (bar.high <= pending.price) {
        setPickHint(
          "피보나치: 고점은 저점보다 위여야 합니다. 다시 고점을 클릭하세요",
        );
        return;
      }
      if (barIdx < pending.barIndex) {
        setPickHint(
          "피보나치: 고점은 저점보다 오른쪽(이후) 봉이어야 합니다",
        );
        return;
      }
      const highAnchor: FibAnchor = {
        date: bar.date,
        barIndex: barIdx,
        price: bar.high,
      };
      const newFib: FibRetracement = { low: pending, high: highAnchor };
      setFibRetracement(newFib);
      setFibPendingLow(null);
      setFibDrawMode(false);
      setPickHint(null);
      onFibChangeRef.current?.();
      drawChartOverlays();
    }
  };

  // ─── Fib draw mode lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (fibDrawMode) {
      setFibPendingLow(null);
      setPickHint("피보나치: 저점(스윙 저) 캔들을 클릭하세요");
    } else {
      setFibPendingLow(null);
      setPickHint(null);
      drawChartOverlays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fibDrawMode]);

  return { pickHint, onFibClick };
}
