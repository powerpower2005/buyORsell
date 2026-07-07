import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const KEY = "tutorial_seen";

const STEPS = [
  {
    title: "티커 형식",
    body: "티커:거래소 형식을 사용하세요. 예: NVDA:NASDAQ",
  },
  {
    title: "Google Finance URL",
    body: "URL의 /quote/ 뒤 부분을 그대로 복사해도 됩니다.",
  },
  {
    title: "데이터 요청",
    body: "캐시가 없으면 GitHub Issue로 fetch를 요청합니다. 1~3분 polling.",
  },
  {
    title: "바로 시작",
    body: "NVDA:NASDAQ 예시로 evaluation을 확인해 보세요.",
  },
];

export function TickerTutorial({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const close = (remember: boolean) => {
    if (remember) localStorage.setItem(KEY, "1");
    setOpen(false);
    onDone?.();
  };

  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start bg-black/60 p-6 sm:items-center">
      <Card className="max-w-md text-left">
        <p className="text-xs text-text-tertiary">
          {step + 1} / {STEPS.length}
        </p>
        <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{s.body}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>다음</Button>
          ) : (
            <Button onClick={() => close(true)}>시작하기</Button>
          )}
          <Button variant="ghost" onClick={() => close(true)}>
            다시 보지 않기
          </Button>
        </div>
      </Card>
    </div>
  );
}
