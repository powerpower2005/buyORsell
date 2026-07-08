import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/Home";
import { GuidePage } from "./pages/Guide";
import { StatusPage } from "./pages/Status";
import { BrowsePage } from "./pages/Browse";

const basename =
  import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
