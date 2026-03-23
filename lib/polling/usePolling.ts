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

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setState((prev) => ({ ...prev, isPolling: true, error: null }));
    
    try {
      const result = await fetchFn();
      
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
        
        config.onError?.(err);
      }
    }
  }, [fetchFn, config]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Setup polling
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
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
