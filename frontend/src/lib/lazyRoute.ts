import { ComponentType, lazy } from "react";

/**
 * A wrapper around React.lazy() that automatically retries the import if it fails
 * due to a stale chunk or network error. This prevents the user from seeing a
 * "This page could not finish loading" error boundary upon deployments or local Dev Server cache changes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  name?: string
) {
  return lazy(async () => {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("172."));

    try {
      return await componentImport();
    } catch (error: any) {
      const isImportFailed =
        error?.message?.includes("Outdated Optimize Dep") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        // Sometimes browsers throw generic errors for missing script modules
        error?.name === "TypeError"; 

      if (isImportFailed && typeof window !== "undefined") {
        const REFRESH_KEY = `student-society-lazy-retry-${name || "unknown"}`;
        const hasRefreshed = sessionStorage.getItem(REFRESH_KEY);

        if (!hasRefreshed) {
          console.warn(`[lazyWithRetry] Module load failed for ${name || "component"}. Automatically reloading page to clear stale cache...`, error);
          sessionStorage.setItem(REFRESH_KEY, "true");
          
          // Use location.replace to avoid clogging the history stack if possible
          window.location.reload();
          
          // Return a dummy promise that never resolves so React doesn't try to render
          // while the page is reloading.
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}
