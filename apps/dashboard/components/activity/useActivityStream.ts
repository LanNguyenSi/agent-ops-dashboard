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

const GATEWAY_URL = "";
const MAX_EVENTS = 200;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const STORAGE_KEY = "ops-activity-events";

const EVENT_TYPES = [
  "agent.registered",
  "agent.heartbeat",
  "agent.disconnected",
  "state.set",
  "state.deleted",
  "state.cas.success",
  "state.cas.conflict",
  "message",
];

function loadStoredEvents(): AgentEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AgentEvent[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {}
}

export function useActivityStream(filters: ActivityFilters): UseActivityStreamResult {
  const [events, setEvents] = useState<AgentEvent[]>(() => loadStoredEvents());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<number | null>(
    events.length > 0 ? events[0].id : null
  );
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
    lastEventIdRef.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const connect = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.agentId) params.set("agentId", filters.agentId);
    if (filters.eventType) params.set("eventType", filters.eventType);
    // Pass last seen event ID so server replays missed events on reconnect
    if (lastEventIdRef.current != null) {
      params.set("cursor", String(lastEventIdRef.current));
    }

    const url = `${GATEWAY_URL}/api/gateway/events/stream?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    const handleEvent = (event: MessageEvent) => {
      try {
        const data: AgentEvent = JSON.parse(event.data as string);
        lastEventIdRef.current = data.id;
        setEvents((prev) => {
          const updated = [data, ...prev];
          const sliced = updated.slice(0, MAX_EVENTS);
          saveEvents(sliced);
          return sliced;
        });
      } catch {
        // Ignore malformed events
      }
    };
    EVENT_TYPES.forEach((type) => es.addEventListener(type, handleEvent as EventListener));

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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      esRef.current?.close();
    };
  }, [connect]);

  return { events, isConnected, error, clearEvents };
}
