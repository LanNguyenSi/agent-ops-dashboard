import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyRepoQuery, getAllRepos, getRepoHealth, normalizeRepoQuery, paginateRepos } from "@/lib/github/repos";
import { clearTtlCache } from "@/lib/github/cache";
import * as client from "@/lib/github/client";

// Mock Octokit
const mockOctokit = {
  repos: {
    get: vi.fn(),
    listForAuthenticatedUser: vi.fn(),
    listForUser: vi.fn(),
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
    clearTtlCache();
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

  it("normalizes query parameters", () => {
    expect(
      normalizeRepoQuery({
        limit: "all",
        page: "2",
        sort: "stars",
        order: "asc",
        filter: "open_prs",
        language: "TypeScript",
      })
    ).toEqual({
      limit: "all",
      page: 2,
      sort: "stars",
      order: "asc",
      filter: "open_prs",
      language: "TypeScript",
    });
  });

  it("paginates filtered repositories with page metadata", () => {
    const paginated = paginateRepos(["a", "b", "c", "d", "e"], 2, 2);

    expect(paginated.items).toEqual(["c", "d"]);
    expect(paginated.page).toBe(2);
    expect(paginated.totalPages).toBe(3);
    expect(paginated.hasPreviousPage).toBe(true);
    expect(paginated.hasNextPage).toBe(true);
    expect(paginated.rangeStart).toBe(3);
    expect(paginated.rangeEnd).toBe(4);
  });

  it("applies filter, sort and limit in memory", () => {
    const repos: import("@/lib/github/types").RepoHealth[] = [
      {
        owner: "test",
        repo: "alpha",
        default_branch: "main",
        html_url: "https://github.com/test/alpha",
        ci_status: "success",
        open_pr_count: 0,
        failing_checks_count: 0,
        last_workflow_run: null,
        updated_at: "2024-01-01T00:00:00Z",
        stars: 2,
        language: "TypeScript",
      },
      {
        owner: "test",
        repo: "beta",
        default_branch: "main",
        html_url: "https://github.com/test/beta",
        ci_status: "failure",
        open_pr_count: 2,
        failing_checks_count: 1,
        last_workflow_run: null,
        updated_at: "2024-01-03T00:00:00Z",
        stars: 10,
        language: "TypeScript",
      },
      {
        owner: "test",
        repo: "gamma",
        default_branch: "main",
        html_url: "https://github.com/test/gamma",
        ci_status: "pending",
        open_pr_count: 1,
        failing_checks_count: 0,
        last_workflow_run: null,
        updated_at: "2024-01-02T00:00:00Z",
        stars: 5,
        language: "Go",
      },
    ];

    const filtered = applyRepoQuery(repos, {
      limit: 1,
      sort: "stars",
      order: "desc",
      filter: "open_prs",
      language: "TypeScript",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repo).toBe("beta");
  });

  it("fetches all user repos with pagination and caches the snapshot", async () => {
    mockOctokit.repos.listForUser
      .mockResolvedValueOnce({
        data: [
          { owner: { login: "test" }, name: "repo-one" },
          { owner: { login: "test" }, name: "repo-two" },
        ],
      })
      .mockResolvedValueOnce({ data: [] });

    mockOctokit.repos.get.mockImplementation(({ repo }: { repo: string }) =>
      Promise.resolve({
        data: {
          default_branch: "main",
          html_url: `https://github.com/test/${repo}`,
          updated_at: "2024-01-01T00:00:00Z",
          description: `${repo} description`,
          stargazers_count: repo === "repo-one" ? 1 : 2,
          language: "TypeScript",
          pushed_at: "2024-01-01T01:00:00Z",
        },
      })
    );

    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({ data: { workflow_runs: [] } });
    mockOctokit.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } });

    const first = await getAllRepos("test");
    const second = await getAllRepos("test");

    expect(first.repos).toHaveLength(2);
    expect(first.cacheState).toBe("miss");
    expect(second.cacheState).toBe("hit");
    expect(mockOctokit.repos.listForUser).toHaveBeenCalledTimes(1);
  });
});
