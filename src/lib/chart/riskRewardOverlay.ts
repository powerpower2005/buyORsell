import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { OHLCVBar } from "@/lib/types";
import {
  formatRewardRisk,
  methodLabelKo,
  RR_V1_HORIZON_BARS,
  type RiskRewardPlan,
} from "@/lib/evaluation/riskReward";
import { CHART_SURFACE, DIRECTION } from "@/lib/chart/chartTheme";

function xAt(chart: IChartApi, date: string): number | null {
  return chart
    .timeScale()
    .timeToCoordinate(date as `${number}-${number}-${number}`);
}

function yAt(
  series: ISeriesApi<"Candlestick">,
  price: number,
): number | null {
  return series.priceToCoordinate(price);
}

/** Draw entry / stop / target bands + RR label (v1). */
export function drawRiskRewardPlans(
  ctx: CanvasRenderingContext2D,
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">,
  bars: OHLCVBar[],
  plans: RiskRewardPlan[],
): void {
  if (!plans.length || !bars.length) return;

  for (const plan of plans) {
    const start = plan.barIndex;
    if (start < 0 || start >= bars.length) continue;
    const end = Math.min(bars.length - 1, start + RR_V1_HORIZON_BARS);
    const x0 = xAt(chart, bars[start]!.date);
    const x1 = xAt(chart, bars[end]!.date);
    const yEntry = yAt(series, plan.entryPrice);
    const yStop = yAt(series, plan.stopPrice);
    const yTarget = yAt(series, plan.targetPrice);
    if (
      x0 == null ||
      x1 == null ||
      yEntry == null ||
      yStop == null ||
      yTarget == null
    ) {
      continue;
    }

    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const width = Math.max(8, right - left);

    ctx.globalAlpha = 0.14;
    ctx.fillStyle = DIRECTION.down;
    ctx.fillRect(
      left,
      Math.min(yEntry, yStop),
      width,
      Math.abs(yStop - yEntry) || 1,
    );
    ctx.fillStyle = DIRECTION.up;
    ctx.fillRect(
      left,
      Math.min(yEntry, yTarget),
      width,
      Math.abs(yTarget - yEntry) || 1,
    );
    ctx.globalAlpha = 1;

    const drawLine = (y: number, color: string, dash: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine(yEntry, CHART_SURFACE.inkMuted, [4, 3]);
    drawLine(yStop, DIRECTION.down, [6, 3]);
    drawLine(yTarget, DIRECTION.up, [6, 3]);

    ctx.strokeStyle = "rgba(226, 232, 240, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(x0, Math.min(yStop, yTarget));
    ctx.lineTo(x0, Math.max(yStop, yTarget));
    ctx.stroke();
    ctx.setLineDash([]);

    const rr = formatRewardRisk(plan.rewardRisk);
    const label = `${rr} · ${methodLabelKo(plan.method)}`;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    const tw = ctx.measureText(label).width;
    const lx = Math.min(right - tw - 6, left + 6);
    const ly = Math.min(yTarget, yEntry) - 6;
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.fillRect(lx - 4, ly - 12, tw + 8, 16);
    ctx.fillStyle = CHART_SURFACE.inkSoft;
    ctx.fillText(label, lx, ly);
  }
}
