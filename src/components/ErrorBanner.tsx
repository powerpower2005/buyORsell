import { Card } from "./ui/Card";

export function ErrorBanner({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-negative/40 bg-negative/10">
      <p className="text-left text-sm font-semibold text-negative">{title}</p>
      <p className="mt-1 text-left text-sm text-text-secondary">{message}</p>
    </Card>
  );
}
