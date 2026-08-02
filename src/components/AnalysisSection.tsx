import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Card } from "./ui/Card";
import {
  toggleAnalysisSection,
  type AnalysisSectionId,
  getAnalysisSectionOpenState,
} from "@/lib/analysisSectionStore";

interface Props {
  id: AnalysisSectionId;
  title: string;
  summary?: string | null;
  children: ReactNode;
}

export function AnalysisSection({ id, title, summary, children }: Props) {
  const [open, setOpen] = useState(() => getAnalysisSectionOpenState()[id]);

  const onToggle = () => {
    const next = toggleAnalysisSection(id);
    setOpen(next[id]);
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-surface-elevated/60"
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {summary ? (
            <p className="mt-0.5 truncate text-xs text-text-tertiary">{summary}</p>
          ) : null}
        </div>
        <span
          className={clsx(
            "shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border px-5 py-4">{children}</div>
      ) : null}
    </Card>
  );
}
