import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const KEY = "tutorial_seen_v2";

const STEPS = [
  {
    title: "티커 형식",
    body: "티커:거래소 형식을 사용하세요. 예: NVDA:NASDAQ, 005930:KRX, BTC-USD",
  },
  {
    title: "데이터 수집 (Sheets)",
    body: "Google Spreadsheet의 GOOGLEFINANCE 함수로 OHLCV를 수집합니다. GitHub Issue「Fetch Quote Data」로 요청하면 Actions가 자동 실행됩니다.",
  },
  {
    title: "수집된 종목",
    body: "fetch가 완료되면 repo의 index.json에 등록되고, 화면 상단 「수집된 종목」 목록에 나타납니다. 칩을 눌러 바로 분석할 수 있습니다.",
  },
  {
    title: "분석 · polling",
    body: "데이터가 없거나 오래되었으면 Issue 요청 후 「polling」으로 1~3분 기다리세요. 최신 데이터면 차트·지표·캔들패턴을 확인할 수 있습니다.",
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
