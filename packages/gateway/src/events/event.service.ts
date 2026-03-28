import { getPool, hasDatabase } from "../db/pool.js";

export const EVENT_TYPES = {
  AGENT_REGISTERED:   "agent.registered",
  AGENT_HEARTBEAT:    "agent.heartbeat",
  AGENT_DISCONNECTED: "agent.disconnected",
  STATE_SET:          "state.set",
  STATE_DELETED:      "state.deleted",
  STATE_CAS_SUCCESS:  "state.cas.success",
  STATE_CAS_CONFLICT: "state.cas.conflict",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export interface AgentEvent {
  id: number;
  agentId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SSESubscriber {
  matches(event: AgentEvent): boolean;
  send(event: AgentEvent): void;
}

function rowToEvent(row: Record<string, unknown>): AgentEvent {
  return {
    id: Number(row.id),
    agentId: (row.agent_id as string | null) ?? null,
    eventType: row.event_type as string,
    payload: row.payload as Record<string, unknown>,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export class EventService {
  private subscribers: Set<SSESubscriber> = new Set();

  /** Append an event to agent_events and broadcast to SSE subscribers */
  async emit(
    eventType: EventType | string,
    agentId: string | null,
    payload: Record<string, unknown>
  ): Promise<AgentEvent> {
    if (!hasDatabase()) {
      // Fallback: broadcast without persistence
      const event: AgentEvent = {
        id: Date.now(),
        agentId,
        eventType,
        payload,
        createdAt: new Date().toISOString(),
      };
      this.broadcast(event);
      return event;
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO agent_events (agent_id, event_type, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [agentId, eventType, JSON.stringify(payload)]
    );
    const event = rowToEvent(rows[0]);
    this.broadcast(event);
    return event;
  }

  /** Query events with optional filters */
  async getEvents(options: {
    agentId?: string;
    eventType?: string;
    since?: string;
    cursor?: number;
    limit?: number;
  } = {}): Promise<{ events: AgentEvent[]; nextCursor: number | null }> {
    if (!hasDatabase()) return { events: [], nextCursor: null };

    const limit = Math.min(options.limit ?? 50, 200);
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM agent_events
       WHERE ($1::text IS NULL OR agent_id = $1)
         AND ($2::text IS NULL OR event_type = $2)
         AND ($3::timestamptz IS NULL OR created_at > $3)
         AND ($4::bigint IS NULL OR id > $4)
       ORDER BY id ASC
       LIMIT $5`,
      [
        options.agentId ?? null,
        options.eventType ?? null,
        options.since ?? null,
        options.cursor ?? null,
        limit + 1, // fetch one extra to determine if there's a next page
      ]
    );

    const hasMore = rows.length > limit;
    const events = rows.slice(0, limit).map(rowToEvent);
    const nextCursor = hasMore ? events[events.length - 1].id : null;

    return { events, nextCursor };
  }

  /** Get events since a specific cursor ID (for SSE replay) */
  async getEventsSince(
    cursor: number,
    filters: { agentId?: string; eventType?: string } = {}
  ): Promise<AgentEvent[]> {
    const { events } = await this.getEvents({
      cursor,
      agentId: filters.agentId,
      eventType: filters.eventType,
      limit: 200,
    });
    return events;
  }

  /** Subscribe to live events. Returns unsubscribe function. */
  subscribe(subscriber: SSESubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private broadcast(event: AgentEvent): void {
    for (const sub of this.subscribers) {
      try {
        if (sub.matches(event)) {
          sub.send(event);
        }
      } catch {
        // Remove broken subscribers silently
        this.subscribers.delete(sub);
      }
    }
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }
}

/** Singleton instance */
export const eventService = new EventService();
