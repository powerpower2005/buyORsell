import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="border-b border-border bg-bg px-6 py-4">
      <div className="mx-auto flex max-w-content items-center justify-between">
        <div className="text-left">
          <Link to="/" className="text-lg font-semibold text-text-primary no-underline">
            GF Evaluator
          </Link>
          <p className="mt-0.5 text-xs text-text-secondary">
            OHLCV technical evaluation
          </p>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link to="/guide" className="text-text-secondary hover:text-text-primary">
            가이드
          </Link>
          <Link to="/status" className="text-text-secondary hover:text-text-primary">
            데이터 현황
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-content text-left">{children}</div>
      </main>
      <footer className="border-t border-border px-6 py-6 text-left text-xs text-text-tertiary">
        <p>데이터·분석 참고용이며 투자 권유가 아닙니다.</p>
      </footer>
    </div>
  );
}
