import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Octokit } from "@octokit/rest";
import { getFailingChecks } from "@/lib/github/checks";
import * as client from "@/lib/github/client";

// Mock Octokit — same spy pattern proven in tests/github/repos.test.ts.
const mockOctokit = {
  repos: {
    get: vi.fn(),
  },
  checks: {
    listForRef: vi.fn(),
  },
};

describe("getFailingChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(client, "getOctokit").mockReturnValue(mockOctokit as unknown as Octokit);
  });

  it("filters to conclusion === failure only and maps fields", async () => {
    mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: "main" } });
    mockOctokit.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            id: 1,
            name: "build",
            status: "completed",
            conclusion: "failure",
            html_url: "https://example.com/1",
            started_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T00:05:00Z",
          },
          {
            id: 2,
            name: "lint",
            status: "completed",
            conclusion: "success",
            html_url: "https://example.com/2",
            started_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T00:05:00Z",
          },
          {
            id: 3,
            name: "typecheck",
            status: "completed",
            conclusion: "neutral",
            html_url: "https://example.com/3",
            started_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T00:05:00Z",
          },
        ],
      },
    });

    const result = await getFailingChecks("acme", "widgets");

    // Only the "failure" conclusion survives; success/neutral are dropped.
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      name: "build",
      status: "completed",
      conclusion: "failure",
      html_url: "https://example.com/1",
      started_at: "2024-01-01T00:00:00Z",
      completed_at: "2024-01-01T00:05:00Z",
    });

    expect(mockOctokit.checks.listForRef).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "acme", repo: "widgets", ref: "main", per_page: 100 })
    );
  });

  it("falls back html_url to empty string and started_at/completed_at to null when missing", async () => {
    mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: "main" } });
    mockOctokit.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            id: 4,
            name: "typecheck",
            status: "queued",
            conclusion: "failure",
            // html_url / started_at / completed_at intentionally absent
          },
        ],
      },
    });

    const result = await getFailingChecks("acme", "widgets");

    expect(result).toEqual([
      {
        id: 4,
        name: "typecheck",
        status: "queued",
        conclusion: "failure",
        html_url: "",
        started_at: null,
        completed_at: null,
      },
    ]);
  });
});
