import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AgentBar } from "@/components/AgentBar";

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const fetchMock = vi.fn();

describe("AgentBar data sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the not-configured reason, and no agents, when the gateway proxy fails and /api/agents answers 503", async () => {
    fetchMock.mockImplementation((url: string) =>
      url === "/api/gateway/agents"
        ? Promise.resolve(res(502, { error: "Gateway 401" }))
        : Promise.resolve(
            res(503, { error: "Agent source not configured: set TRIOLOGUE_HEALTH_URL", code: "NOT_CONFIGURED" }),
          ),
    );

    render(<AgentBar />);

    await waitFor(() =>
      expect(screen.getByText(/Agent source not configured/)).toBeTruthy(),
    );
    expect(screen.queryByText(/Agents?$/)).toBeNull();
  });

  it("falls back to a generic error when /api/agents gives no readable reason", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("network")));

    render(<AgentBar />);

    await waitFor(() => expect(screen.getByText("Could not reach agent data source")).toBeTruthy());
  });

  it("shows 'No agents registered' for an empty gateway registry", async () => {
    fetchMock.mockResolvedValue(res(200, []));

    render(<AgentBar />);

    await waitFor(() => expect(screen.getByText("No agents registered")).toBeTruthy());
  });
});
