import { Card, SectionTitle } from "./ui/Card";
import {
  formatVolume,
  type VolumeMaSnapshot,
} from "@/lib/evaluation/volumeMa";

interface Props {
  snapshot: VolumeMaSnapshot;
}

export function VolumePanel({ snapshot }: Props) {
  return (
    <Card>
      <SectionTitle>거래량</SectionTitle>
      <div className="text-left">
        <p className="text-xs text-text-tertiary">
          최근 봉 ({snapshot.currentDate})
        </p>
        <p className="tabular-nums text-2xl font-semibold">
          {formatVolume(snapshot.currentVolume)}
        </p>
      </div>
    </Card>
  );
}
