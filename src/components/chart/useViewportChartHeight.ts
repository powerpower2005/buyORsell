import { useEffect, useState } from "react";
import { computeMainPaneHeight } from "@/lib/chart/chartTheme";

export function useViewportChartHeight(
  fixed: number | undefined,
  auxPaneHeights: number[],
) {
  const auxKey = auxPaneHeights.join(",");
  const compute = () =>
    computeMainPaneHeight({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      auxPaneHeights,
    });

  const [height, setHeight] = useState(fixed ?? 720);

  useEffect(() => {
    if (fixed != null) {
      setHeight(fixed);
      return;
    }
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setHeight(compute()));
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
    // auxKey serializes heights so we don't depend on array identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixed, auxKey]);

  return height;
}
