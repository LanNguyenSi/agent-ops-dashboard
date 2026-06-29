/**
 * Tests for packages/client/src/api-client.ts
 *
 * axios is mocked so no real HTTP calls are made.  The mock instance is created
 * via vi.hoisted() so the factory callback for vi.mock('axios') can close over it
 * before static imports are resolved.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup: create fake axios instance variables BEFORE vi.mock is evaluated.
// ---------------------------------------------------------------------------
const { mockPost, mockGet, mockCreate } = vi.hoisted(() => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockCreate = vi.fn();
  mockCreate.mockReturnValue({ post: mockPost, get: mockGet });
  return { mockPost, mockGet, mockCreate };
});

vi.mock("axios", () => ({
  default: { create: mockCreate },
}));

import { AgentOpsClient } from "../api-client";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const GATEWAY_URL = "http://test-gateway:3001";
const TOKEN = "test-bearer-token-xyz";

const MOCK_AGENT = {
  id: "agent-001",
  name: "test-agent",
  status: "online" as const,
  tags: ["ci"],
  lastSeen: "2024-01-01T00:00:00.000Z",
  registeredAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  // Reset call counts and queued return values; preserve mockReturnValue on
  // mockCreate so subsequent new AgentOpsClient() calls still get the fake instance.
  mockPost.mockReset();
  mockGet.mockReset();
  mockCreate.mockReset();
  mockCreate.mockReturnValue({ post: mockPost, get: mockGet });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
describe("AgentOpsClient constructor", () => {
  it("passes the baseURL to axios.create", () => {
    new AgentOpsClient(GATEWAY_URL);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: GATEWAY_URL }),
    );
  });

  it("sets the timeout to 10000 ms", () => {
    new AgentOpsClient(GATEWAY_URL);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 10000 }),
    );
  });

  it("includes Authorization header when a token is provided", () => {
    new AgentOpsClient(GATEWAY_URL, { token: TOKEN });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    );
  });

  it("does NOT include Authorization header when no token is provided", () => {
    new AgentOpsClient(GATEWAY_URL);

    const createArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    const headers = createArgs["headers"] as Record<string, unknown>;
    expect(headers["Authorization"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------
describe("AgentOpsClient.register", () => {
  it("POSTs to /agents/register with the given payload", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockResolvedValueOnce({ data: MOCK_AGENT });

    const payload = { name: "test-agent", tags: ["ci"] };
    await client.register(payload);

    expect(mockPost).toHaveBeenCalledWith("/agents/register", payload);
  });

  it("returns the agent returned by the API", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockResolvedValueOnce({ data: MOCK_AGENT });

    const result = await client.register({ name: "test-agent" });

    expect(result).toEqual(MOCK_AGENT);
  });

  it("propagates a network error as a rejected promise", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(client.register({ name: "test-agent" })).rejects.toThrow("ECONNREFUSED");
  });
});

// ---------------------------------------------------------------------------
// heartbeat()
// ---------------------------------------------------------------------------
describe("AgentOpsClient.heartbeat", () => {
  it("POSTs to /agents/{id}/heartbeat with the given payload", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockResolvedValueOnce({ data: MOCK_AGENT });

    await client.heartbeat("agent-001", { status: "busy", currentTask: "running tests" });

    expect(mockPost).toHaveBeenCalledWith("/agents/agent-001/heartbeat", {
      status: "busy",
      currentTask: "running tests",
    });
  });

  it("returns the updated agent", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    const updated = { ...MOCK_AGENT, status: "busy" as const };
    mockPost.mockResolvedValueOnce({ data: updated });

    const result = await client.heartbeat("agent-001", {});

    expect(result.status).toBe("busy");
  });

  it("defaults the payload to an empty object", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockResolvedValueOnce({ data: MOCK_AGENT });

    await client.heartbeat("agent-001");

    expect(mockPost).toHaveBeenCalledWith("/agents/agent-001/heartbeat", {});
  });
});

// ---------------------------------------------------------------------------
// getAgents()
// ---------------------------------------------------------------------------
describe("AgentOpsClient.getAgents", () => {
  it("GETs /agents", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockGet.mockResolvedValueOnce({ data: [MOCK_AGENT] });

    await client.getAgents();

    expect(mockGet).toHaveBeenCalledWith("/agents");
  });

  it("returns the list of agents from the response", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    const agents = [MOCK_AGENT, { ...MOCK_AGENT, id: "agent-002", name: "second" }];
    mockGet.mockResolvedValueOnce({ data: agents });

    const result = await client.getAgents();

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("agent-001");
    expect(result[1]?.id).toBe("agent-002");
  });

  it("propagates a network error", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockGet.mockRejectedValueOnce(new Error("Timeout"));

    await expect(client.getAgents()).rejects.toThrow("Timeout");
  });
});

// ---------------------------------------------------------------------------
// sendCommand()
// ---------------------------------------------------------------------------
describe("AgentOpsClient.sendCommand", () => {
  it("POSTs to /agents/{id}/command with the given payload", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    const cmdResponse = { ok: true, result: "done" };
    mockPost.mockResolvedValueOnce({ data: cmdResponse });

    await client.sendCommand("agent-001", { command: "restart", args: { force: true } });

    expect(mockPost).toHaveBeenCalledWith("/agents/agent-001/command", {
      command: "restart",
      args: { force: true },
    });
  });

  it("returns the command response", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    const cmdResponse = { ok: true, result: "ack" };
    mockPost.mockResolvedValueOnce({ data: cmdResponse });

    const result = await client.sendCommand("agent-001", { command: "ping" });

    expect(result).toEqual(cmdResponse);
  });

  it("propagates errors from the POST call", async () => {
    const client = new AgentOpsClient(GATEWAY_URL);
    mockPost.mockRejectedValueOnce(new Error("Command rejected"));

    await expect(
      client.sendCommand("agent-001", { command: "shutdown" }),
    ).rejects.toThrow("Command rejected");
  });
});
