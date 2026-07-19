import { useEffect } from "react";
import { IndicatorConfigForm } from "./IndicatorConfigForm";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

export function IndicatorConfigModal({ open, onClose, onChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="indicator-config-title"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[min(90vh,840px)] w-full max-w-lg flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2
              id="indicator-config-title"
              className="text-base font-semibold text-text-primary"
            >
              기술 지표 설정
            </h2>
            <p className="mt-0.5 text-[11px] text-text-tertiary">
              기간·색상·사용 여부 (차트 레이어 on/off와 별개)
            </p>
          </div>
          <Button variant="ghost" className="shrink-0 px-2 py-1" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">
          <IndicatorConfigForm onChange={onChange} />
        </div>
      </Card>
    </div>
  );
}
