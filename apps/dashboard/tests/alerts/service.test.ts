import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getPipelineRuns = vi.fn();
const getAgentActivity = vi.fn();
const getAgentSourceUrl = vi.fn();

vi.mock("@/lib/pipeline/service", () => ({
  getPipelineRuns: (...a: unknown[]) => getPipelineRuns(...a),
}));
vi.mock("@/lib/agents/client", () => ({
  getAgentActivity: (...a: unknown[]) => getAgentActivity(...a),
  getAgentSourceUrl: () => getAgentSourceUrl(),
}));

import { getAlerts } from "@/lib/alerts/service";

describe("getAlerts (live path)", () => {
  const prevRepos = process.env.GITHUB_REPOS;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.GITHUB_REPOS = "owner/repo";
    getPipelineRuns.mockResolvedValue([]);
    getAgentSourceUrl.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (prevRepos === undefined) delete process.env.GITHUB_REPOS;
    else process.env.GITHUB_REPOS = prevRepos;
  });

  it("returns only rule-generated alerts, with no sample alerts appended", async () => {
    const alerts = await getAlerts();

    expect(alerts).toEqual([]);
  });

  it("returns no alerts, and reads no data source, when GITHUB_REPOS is unset", async () => {
    delete process.env.GITHUB_REPOS;

    await expect(getAlerts()).resolves.toEqual([]);
    expect(getPipelineRuns).not.toHaveBeenCalled();
  });

  it("rethrows an evaluation failure instead of returning sample alerts", async () => {
    getAgentSourceUrl.mockImplementation(() => {
      throw new Error("config exploded");
    });

    await expect(getAlerts()).rejects.toThrow("config exploded");
  });

  it("does not call the agent source when it is not configured", async () => {
    await getAlerts();
    expect(getAgentActivity).not.toHaveBeenCalled();
  });

  it("evaluates agent rules over the configured source's agents", async () => {
    getAgentSourceUrl.mockReturnValue("https://triologue.example/gateway/health");
    const longAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    getAgentActivity.mockResolvedValue({
      agents: [
        {
          id: "ghost",
          name: "Ghost",
          status: "offline",
          lastMessage: null,
          lastMessageAt: longAgo,
          connectedAt: longAgo,
          uptime: 0,
          platform: "x",
        },
      ],
      totalAgents: 1,
      onlineAgents: 0,
      offlineAgents: 1,
      lastUpdate: new Date().toISOString(),
    });

    const alerts = await getAlerts();

    expect(getAgentActivity).toHaveBeenCalledOnce();
    expect(alerts.map((a) => a.id)).toContain("agent-offline-ghost");
  });

  it("raises no agent alerts and no mock alerts when the configured source fails", async () => {
    getAgentSourceUrl.mockReturnValue("https://triologue.example/gateway/health");
    getAgentActivity.mockRejectedValue(new Error("down"));

    await expect(getAlerts()).resolves.toEqual([]);
  });
});
