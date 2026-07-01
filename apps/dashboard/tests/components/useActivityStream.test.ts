import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useActivityStream } from "@/components/activity/useActivityStream";

// jsdom does not implement EventSource; provide a minimal controllable fake.
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners: Record<string, Array<(e: { data: string }) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: { data: string }) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.();
  }

  emitError() {
    this.onerror?.();
  }

  emit(type: string, data: unknown) {
    this.listeners[type]?.forEach((cb) => cb({ data: JSON.stringify(data) }));
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useActivityStream", () => {
  it("opens an EventSource on mount and sets isConnected true on open", () => {
    const { result } = renderHook(() => useActivityStream({}));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(result.current.isConnected).toBe(false);

    act(() => {
      FakeEventSource.instances[0]?.emitOpen();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("prepends incoming events matching a registered event type", () => {
    const { result } = renderHook(() => useActivityStream({}));
    const es = FakeEventSource.instances[0]!;

    act(() => {
      es.emit("agent.registered", {
        id: 1,
        agentId: "a1",
        eventType: "agent.registered",
        payload: {},
        createdAt: "2026-01-01T00:00:00Z",
      });
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]?.id).toBe(1);
    expect(result.current.events[0]?.eventType).toBe("agent.registered");
  });

  it("clearEvents empties the list and removes the sessionStorage entry", () => {
    const { result } = renderHook(() => useActivityStream({}));
    const es = FakeEventSource.instances[0]!;

    act(() => {
      es.emit("agent.registered", {
        id: 1,
        agentId: "a1",
        eventType: "agent.registered",
        payload: {},
        createdAt: "2026-01-01T00:00:00Z",
      });
    });
    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toHaveLength(0);
    expect(sessionStorage.getItem("ops-activity-events")).toBeNull();
  });

  it("on error: closes the source, marks disconnected, and reconnects with backoff", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useActivityStream({}));
    const first = FakeEventSource.instances[0]!;

    act(() => {
      first.emitError();
    });

    expect(first.closed).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toContain("Reconnecting");

    // Base reconnect delay is 1000ms — advancing past it opens a new source.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = renderHook(() => useActivityStream({}));
    const es = FakeEventSource.instances[0]!;

    unmount();

    expect(es.closed).toBe(true);
  });
});
