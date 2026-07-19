import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { HelpContent } from "@/lib/indicatorHelp";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  help: HelpContent;
  /** Accessible name for the ? control. */
  label?: string;
}

/** Compact "?" control that opens a help popup (works inside modals). */
export function HelpTip({ help, label }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const dialog =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={() => setOpen(false)}
      >
        <Card
          className="max-h-[min(80vh,520px)] w-full max-w-md overflow-y-auto text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <h3
              id={titleId}
              className="text-sm font-semibold text-text-primary"
            >
              {help.title}
            </h3>
            <Button
              variant="ghost"
              className="shrink-0 px-2 py-1 text-xs"
              onClick={() => setOpen(false)}
            >
              닫기
            </Button>
          </div>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {help.summary}
            </p>

            {help.howToFind && (
              <div className="mt-4 rounded-md border border-border/80 bg-bg px-3 py-2.5">
                <p className="text-[11px] font-semibold text-text-primary">
                  찾는 법
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {help.howToFind}
                </p>
              </div>
            )}

            {(help.higher || help.lower) && (
            <div className="mt-4 space-y-2.5">
              {help.higher && (
                <div className="rounded-md border border-border/80 bg-bg px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-accent">
                    {help.higherLabel ?? "값이 높아지면"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {help.higher}
                  </p>
                </div>
              )}
              {help.lower && (
                <div className="rounded-md border border-border/80 bg-bg px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-text-tertiary">
                    {help.lowerLabel ?? "값이 낮아지면"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {help.lower}
                  </p>
                </div>
              )}
            </div>
          )}

          {help.worksWith && (
            <div className="mt-4 rounded-md border border-border/80 bg-bg px-3 py-2.5">
              <p className="text-[11px] font-semibold text-text-primary">
                같이 보면 좋은 것
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {help.worksWith}
              </p>
            </div>
          )}

          {help.tip && (
            <p className="mt-4 text-[11px] leading-relaxed text-text-tertiary">
              참고: {help.tip}
            </p>
          )}
        </Card>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold leading-none text-text-tertiary hover:border-accent/50 hover:text-accent"
        aria-label={label ?? `${help.title} 도움말`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {dialog}
    </>
  );
}
