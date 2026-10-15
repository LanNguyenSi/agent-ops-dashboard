import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AgentSourceError,
  AgentSourceNotConfiguredError,
  getAgentActivity,
  getAgentSourceUrl,
} from "@/lib/agents/client";

const URL_ENV = "TRIOLOGUE_HEALTH_URL";
const fetchMock = vi.fn();

describe("getAgentActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env[URL_ENV];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env[URL_ENV];
  });

  it("throws AgentSourceNotConfiguredError and never fetches when the env var is unset", async () => {
    await expect(getAgentActivity()).rejects.toBeInstanceOf(AgentSourceNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a blank env var as not configured", async () => {
    process.env[URL_ENV] = "   ";
    expect(getAgentSourceUrl()).toBeNull();
    await expect(getAgentActivity()).rejects.toBeInstanceOf(AgentSourceNotConfiguredError);
  });

  it("reads the health URL from the env var and parses the agents", async () => {
    process.env[URL_ENV] = "https://triologue.example/gateway/health";
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "ok",
          connectedAgents: 2,
          agents: [
            { id: "a", name: "Alpha", status: "online" },
            { id: "b", name: "Beta", status: "offline" },
          ],
        }),
    });

    const activity = await getAgentActivity();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://triologue.example/gateway/health",
      expect.anything(),
    );
    expect(activity.agents.map((a) => a.id)).toEqual(["a", "b"]);
    expect(activity.totalAgents).toBe(2);
    expect(activity.onlineAgents).toBe(1);
  });

  it("throws AgentSourceError (no mock agents) when the endpoint answers non-2xx", async () => {
    process.env[URL_ENV] = "https://triologue.example/gateway/health";
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    await expect(getAgentActivity()).rejects.toThrow(AgentSourceError);
    await expect(getAgentActivity()).rejects.toThrow("Triologue API responded with 500");
  });

  it("throws AgentSourceError when the request itself fails", async () => {
    process.env[URL_ENV] = "https://triologue.example/gateway/health";
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getAgentActivity()).rejects.toThrow(AgentSourceError);
  });
});
