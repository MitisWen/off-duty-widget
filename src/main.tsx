import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { OvertimeBubble } from "./components/OvertimeBubble";
import { isDesktop } from "./lib/desktop";
import "./styles/tokens.css";
import "./styles/widget.css";

const isBubbleWindow =
  (isDesktop() && getCurrentWindow().label === "bubble") ||
  new URLSearchParams(window.location.search).get("view") === "bubble";

// Windows rounds the native window at ~8px, so the CSS corners match that radius.
if (navigator.userAgent.includes("Windows")) {
  document.documentElement.dataset.os = "windows";
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isBubbleWindow ? <OvertimeBubble /> : <App />}</React.StrictMode>,
);
