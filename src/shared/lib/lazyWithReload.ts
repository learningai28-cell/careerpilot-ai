import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// After a deploy, hashed chunk files from the previous build are gone. A tab
// that was opened before the deploy will fail to import them. Reload once to
// pick up the new index.html; sessionStorage guards against reload loops.
const RELOAD_KEY = "cp:chunk-reload-at";
const RELOAD_WINDOW_MS = 10_000;

function readLastReload(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function writeLastReload(value: number) {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(value));
  } catch {
    /* storage unavailable */
  }
}

/** Reloads the page unless one was already triggered recently. Returns true if reloading. */
export function reloadOnceForNewDeploy(): boolean {
  const last = readLastReload();
  if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
  writeLastReload(Date.now());
  window.location.reload();
  return true;
}

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|Unable to preload CSS/i.test(
    msg
  );
}

/** Vite fires `vite:preloadError` when a dynamic import's preload fails (stale chunk). */
export function installPreloadErrorHandler() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForNewDeploy()) event.preventDefault();
  });
}

/**
 * React.lazy wrapper: on a chunk-load failure, reload once. If a reload
 * already happened recently, rethrow so the ErrorBoundary shows the error.
 */
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err) && reloadOnceForNewDeploy()) {
        // Page is reloading; stay pending so no error flashes.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
