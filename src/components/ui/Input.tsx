import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-border bg-surface-elevated px-4 py-3 text-left text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
