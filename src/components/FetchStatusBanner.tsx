import { Badge } from "./ui/Badge";

interface Props {
  polling: boolean;
  message?: string;
}

export function FetchStatusBanner({ polling, message }: Props) {
  if (!polling && !message) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-left">
      {polling && <Badge variant="running">Polling raw JSON…</Badge>}
      {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
    </div>
  );
}
