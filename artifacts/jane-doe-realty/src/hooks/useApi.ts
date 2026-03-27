import { useState, useEffect } from "react";

/**
 * Generic data-fetching hook with fallback.
 * - Calls `fetcher()` on mount (and whenever `deps` change).
 * - While the API is unreachable the component renders with `fallback` data.
 * - Once the API responds the component re-renders with live data.
 */
export function useApi<T>(
  fetcher: () => Promise<T | null>,
  fallback: T,
  deps: any[] = []
): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((res) => {
        if (!cancelled && res) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading };
}
