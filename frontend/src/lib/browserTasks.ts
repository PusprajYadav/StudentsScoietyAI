type DeferredTaskHandle =
  | {
      kind: "idle";
      id: number;
    }
  | {
      kind: "timeout";
      id: number;
    };

type IdleCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function scheduleDeferredTask(
  task: () => void,
  options: {
    timeout?: number;
  } = {}
) {
  if (typeof window === "undefined") {
    task();
    return null;
  }

  const idleWindow = window as IdleCapableWindow;
  const timeout = options.timeout ?? 1200;

  if (typeof idleWindow.requestIdleCallback === "function") {
    return {
      kind: "idle",
      id: idleWindow.requestIdleCallback(() => task(), { timeout }),
    } satisfies DeferredTaskHandle;
  }

  return {
    kind: "timeout",
    id: window.setTimeout(task, Math.min(timeout, 250)),
  } satisfies DeferredTaskHandle;
}

export function cancelDeferredTask(handle: DeferredTaskHandle | null) {
  if (!handle || typeof window === "undefined") {
    return;
  }

  const idleWindow = window as IdleCapableWindow;

  if (handle.kind === "idle" && typeof idleWindow.cancelIdleCallback === "function") {
    idleWindow.cancelIdleCallback(handle.id);
    return;
  }

  window.clearTimeout(handle.id);
}

export function runWhenDocumentVisible(task: () => void) {
  if (typeof document === "undefined") {
    task();
    return () => undefined;
  }

  if (document.visibilityState === "visible") {
    task();
    return () => undefined;
  }

  const handleVisibility = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    document.removeEventListener("visibilitychange", handleVisibility);
    task();
  };

  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}
