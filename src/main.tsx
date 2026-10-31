import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { initAnalytics } from "./shared/lib/analytics";
import { installPreloadErrorHandler } from "./shared/lib/lazyWithReload";
import { captureReferralFromUrl } from "./shared/lib/referral";
import "./styles/globals.css";

installPreloadErrorHandler();
initAnalytics();
captureReferralFromUrl();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
