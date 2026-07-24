import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { initAnalytics } from "./shared/lib/analytics";
import "./styles/globals.css";

initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
