"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PollConfig, PollState } from "./types";

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  config: PollConfig
): [T | null, PollState, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<PollState>({
    isPolling: false,
    lastUpdate: null,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // fetchFn and onError are read through refs so that `fetchData` stays
  // referentially stable. Callers naturally pass an inline closure and an
  // inline `{ enabled, interval }` literal, which get a fresh identity on
  // every render; if `fetchData` depended on them directly, the polling
  // effect below would re-run each render, call setState, and re-render:
  // an infinite loop. Only the two primitives drive the effect.
  const fetchFnRef = useRef(fetchFn);
  const onErrorRef = useRef(config.onError);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
    onErrorRef.current = config.onError;
  });

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState((prev) => ({ ...prev, isPolling: true, error: null }));

    try {
      const result = await fetchFnRef.current();

      if (isMountedRef.current) {
        setData(result);
        setState({
          isPolling: false,
          lastUpdate: new Date(),
          error: null,
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (isMountedRef.current) {
        setState({
          isPolling: false,
          lastUpdate: null,
          error: err,
        });

        onErrorRef.current?.(err);
      }
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Setup polling
  useEffect(() => {
    isMountedRef.current = true;

    // Kicking off the first fetch is the point of the hook. No suppression
    // needed: fetchData is stable (empty deps, reads fetchFn through a ref),
    // so the rule no longer sees a setState that can feed back into its own
    // effect. The disable this replaced was hiding the loop, not accepting it.
    fetchData();

    // Setup interval if enabled
    if (config.enabled && config.interval > 0) {
      intervalRef.current = setInterval(fetchData, config.interval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config.enabled, config.interval, fetchData]);

  return [data, state, refresh];
}
