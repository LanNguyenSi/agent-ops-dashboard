"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface AgentEvent {
  id: number;
  agentId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityFilters {
  agentId?: string;
  eventType?: string;
}

export interface UseActivityStreamResult {
  events: AgentEvent[];
  isConnected: boolean;
  error: string | null;
  clearEvents: () => void;
}

// Use the Next.js proxy route so the browser doesn't need direct gateway access
const GATEWAY_URL = "";
const MAX_EVENTS = 200;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function useActivityStream(
  filters: ActivityFilters = {}
): UseActivityStreamResult {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEventIdRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.agentId) params.set("agentId", filters.agentId);
    if (filters.eventType) params.set("eventType", filters.eventType);
    if (lastEventIdRef.current != null) {
      params.set("lastEventId", String(lastEventIdRef.current));
    }

    const url = `${GATEWAY_URL}/api/events/stream?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data: AgentEvent = JSON.parse(event.data as string);
        lastEventIdRef.current = data.id;
        setEvents((prev) => {
          const updated = [data, ...prev];
          return updated.slice(0, MAX_EVENTS);
        });
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptsRef.current),
        RECONNECT_MAX_MS
      );
      reconnectAttemptsRef.current += 1;
      setError(`Disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`);
      reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
    };
  }, [filters.agentId, filters.eventType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, error, clearEvents };
}
