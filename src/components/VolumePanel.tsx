import { Card, SectionTitle } from "./ui/Card";
import type { Timeframe } from "@/lib/types";
import {
  formatVolume,
  volumeMaColor,
  volumeMaLabel,
  volumeMaUnavailableReason,
  type VolumeMaSnapshot,
} from "@/lib/evaluation/volumeMa";

interface Props {
  snapshot: VolumeMaSnapshot;
  timeframe: Timeframe;
}

export function VolumePanel({ snapshot, timeframe }: Props) {
  return (
    <Card>
      <SectionTitle>거래량 · 이동평균</SectionTitle>
      <div className="mb-4 text-left">
        <p className="text-xs text-text-tertiary">
          최근 봉 ({snapshot.currentDate})
        </p>
        <p className="tabular-nums text-2xl font-semibold">
          {formatVolume(snapshot.currentVolume)}
        </p>
      </div>
      <div className="grid gap-3 text-left sm:grid-cols-2">
        {snapshot.averages.map((avg) => {
          const label = volumeMaLabel(avg.period, timeframe);
          return (
            <div key={avg.period}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: volumeMaColor(avg.period) }}
                />
                <p className="text-xs text-text-tertiary">{label}</p>
              </div>
              {avg.available && avg.latest != null ? (
                <>
                  <p className="tabular-nums text-lg font-medium">
                    {formatVolume(avg.latest)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    현재 / 평균:{" "}
                    {(snapshot.currentVolume / avg.latest).toFixed(2)}x
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-text-tertiary">
                  {volumeMaUnavailableReason(avg.period, timeframe)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
