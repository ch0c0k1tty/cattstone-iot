import { useCallback, useEffect, useState } from "react";
import type { PartsDataSource, PartsSnapshot, ReadingValue } from "./types";

export function useParts(source: PartsDataSource, refreshMs = 5_000) {
  const [data, setData] = useState<PartsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await source.getSnapshot(signal);
      if (signal?.aborted) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : "Could not load parts");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const id = window.setInterval(() => { void refresh(controller.signal); }, refreshMs);
    return () => { controller.abort(); window.clearInterval(id); };
  }, [refresh, refreshMs]);

  const setControl = useCallback(async (partId: string, metricId: string, value: ReadingValue) => {
    const key = `${partId}.${metricId}`;
    setPending(key);
    setError(null);
    try {
      await source.setControl(partId, metricId, value);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update control");
    } finally {
      setPending(null);
    }
  }, [source, refresh]);

  return { data, loading, error, pending, refresh, setControl };
}
