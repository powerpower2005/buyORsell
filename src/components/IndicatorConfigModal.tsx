import { useEffect } from "react";
import { IndicatorConfigForm } from "./IndicatorConfigForm";
import { Button } from "./ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

/** Right-edge settings drawer (collapsible sidebar). */
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
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="기술 지표 설정 닫기"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="indicator-config-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
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
          <Button
            variant="ghost"
            className="shrink-0 px-2 py-1 text-xs"
            onClick={onClose}
            title="사이드바 접기"
          >
            접기
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <IndicatorConfigForm onChange={onChange} />
        </div>
      </aside>
    </div>
  );
}
