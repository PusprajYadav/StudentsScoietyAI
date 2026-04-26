import { useEffect, useRef } from "react";

interface UseInfiniteScrollTriggerOptions {
  enabled?: boolean;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string;
}

export function useInfiniteScrollTrigger({
  enabled = true,
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "800px 0px",
}: UseInfiniteScrollTriggerOptions) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const node = triggerRef.current;

    if (!enabled || !node || !hasMore || loading) {
      return;
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || cancelled || loadingRef.current) {
          return;
        }

        loadingRef.current = true;
        Promise.resolve(onLoadMore()).finally(() => {
          loadingRef.current = false;
        });
      },
      { rootMargin }
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [enabled, hasMore, loading, onLoadMore, rootMargin]);

  return triggerRef;
}
