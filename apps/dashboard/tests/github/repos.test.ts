import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRepoHealth } from "@/lib/github/repos";
import * as client from "@/lib/github/client";

// Mock Octokit
const mockOctokit = {
  repos: {
    get: vi.fn(),
  },
  pulls: {
    list: vi.fn(),
  },
  actions: {
    listWorkflowRunsForRepo: vi.fn(),
  },
  checks: {
    listForRef: vi.fn(),
  },
};

describe("getRepoHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(client, "getOctokit").mockReturnValue(mockOctokit as any);
  });
  
  it("returns repo health with CI status success", async () => {
    mockOctokit.repos.get.mockResolvedValue({
      data: {
        default_branch: "main",
        html_url: "https://github.com/test/repo",
        updated_at: "2024-01-01T00:00:00Z",
      },
    });
    
    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({
      data: {
        workflow_runs: [
          {
            id: 1,
            name: "CI",
            status: "completed",
            conclusion: "success",
            html_url: "https://github.com/test/repo/actions/runs/1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:05:00Z",
            head_branch: "main",
            head_sha: "abc123",
          },
        ],
      },
    });
    
    mockOctokit.checks.listForRef.mockResolvedValue({
      data: { check_runs: [] },
    });
    
    const health = await getRepoHealth("test", "repo");
    
    expect(health.owner).toBe("test");
    expect(health.repo).toBe("repo");
    expect(health.ci_status).toBe("success");
    expect(health.failing_checks_count).toBe(0);
  });
  
  it("handles rate limiting", async () => {
    mockOctokit.repos.get.mockRejectedValue({
      status: 429,
      response: { headers: { "x-ratelimit-reset": "1704067200" } },
    });
    
    await expect(getRepoHealth("test", "repo")).rejects.toThrow("Rate limited");
  });
});
