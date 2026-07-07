import clsx from "clsx";

type BadgeVariant = "fresh" | "stale" | "running" | "muted" | "positive" | "negative";

const styles: Record<BadgeVariant, string> = {
  fresh: "bg-positive/15 text-positive",
  stale: "bg-negative/15 text-negative",
  running: "bg-accent/15 text-accent",
  muted: "bg-surface-elevated text-text-secondary",
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/15 text-negative",
};

export function Badge({
  variant = "muted",
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-0.5 text-left text-xs font-medium",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
}
