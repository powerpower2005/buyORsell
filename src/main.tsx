import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/pretendard/400.css";
import "@fontsource/pretendard/600.css";
import "@fontsource/pretendard/700.css";
import "./styles/tokens.css";
import "./styles/globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
