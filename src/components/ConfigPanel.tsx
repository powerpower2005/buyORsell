import { IndicatorConfigForm } from "./IndicatorConfigForm";
import { Card, SectionTitle } from "./ui/Card";

interface Props {
  onChange: () => void;
}

/** Inline card wrapper around IndicatorConfigForm (legacy / embed). */
export function ConfigPanel({ onChange }: Props) {
  return (
    <Card>
      <SectionTitle>기술 지표 설정</SectionTitle>
      <div className="mt-4">
        <IndicatorConfigForm onChange={onChange} />
      </div>
    </Card>
  );
}
