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
  request: vi.fn(),
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

    mockOctokit.request.mockResolvedValue({
      data: [
        { security_advisory: { severity: "critical" } },
        { security_advisory: { severity: "high" } },
        { security_advisory: { severity: "high" } },
      ],
    });
    
    const health = await getRepoHealth("test", "repo");
    
    expect(health.owner).toBe("test");
    expect(health.repo).toBe("repo");
    expect(health.ci_status).toBe("success");
    expect(health.failing_checks_count).toBe(0);
    expect(health.vulnerabilities).toEqual({
      total: 3,
      critical: 1,
      high: 2,
      medium: 0,
      low: 0,
    });
  });

  it("gracefully ignores inaccessible dependabot alerts", async () => {
    mockOctokit.repos.get.mockResolvedValue({
      data: {
        default_branch: "main",
        html_url: "https://github.com/test/repo",
        updated_at: "2024-01-01T00:00:00Z",
      },
    });
    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({ data: { workflow_runs: [] } });
    mockOctokit.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } });
    mockOctokit.request.mockRejectedValue({
      status: 404,
      response: { headers: {} },
    });

    const health = await getRepoHealth("test", "repo");

    expect(health.vulnerabilities).toBeUndefined();
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
        filter: "vulnerable",
        language: "TypeScript",
      })
    ).toEqual({
      limit: "all",
      page: 2,
      sort: "stars",
      order: "asc",
      filter: "vulnerable",
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
        full_name: "test/alpha",
        default_branch: "main",
        html_url: "https://github.com/test/alpha",
        ci_status: "success",
        open_pr_count: 0,
        failing_checks_count: 0,
        last_workflow_run: null,
        updated_at: "2024-01-01T00:00:00Z",
        stars: 2,
        language: "TypeScript",
        vulnerabilities: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      },
      {
        owner: "test",
        repo: "beta",
        full_name: "test/beta",
        default_branch: "main",
        html_url: "https://github.com/test/beta",
        ci_status: "failure",
        open_pr_count: 2,
        failing_checks_count: 1,
        last_workflow_run: null,
        updated_at: "2024-01-03T00:00:00Z",
        stars: 10,
        language: "TypeScript",
        vulnerabilities: {
          total: 2,
          critical: 1,
          high: 1,
          medium: 0,
          low: 0,
        },
      },
      {
        owner: "test",
        repo: "gamma",
        full_name: "test/gamma",
        default_branch: "main",
        html_url: "https://github.com/test/gamma",
        ci_status: "pending",
        open_pr_count: 1,
        failing_checks_count: 0,
        last_workflow_run: null,
        updated_at: "2024-01-02T00:00:00Z",
        stars: 5,
        language: "Go",
        vulnerabilities: {
          total: 1,
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
        },
      },
    ];

    const filtered = applyRepoQuery(repos, {
      limit: 1,
      page: 1,
      sort: "stars",
      order: "desc",
      filter: "vulnerable",
      language: "TypeScript",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repo).toBe("beta");
  });

  it("drops cross-owner repos returned by listForAuthenticatedUser", async () => {
    // Regression for the 2026-04-12 CVE-leak: when the token had
    // access to repos under a second owner, `listForAuthenticatedUser`
    // returned them unfiltered. Downstream filters matched on short
    // `repo` name, collapsing LanNguyenSi/lava-memories (clean) and
    // lavaclawdbot/lava-memories (vulnerable) into one entry. The
    // filter in listAllReposForUser must now scope by owner login.
    mockOctokit.repos.listForAuthenticatedUser.mockReset();
    mockOctokit.repos.listForAuthenticatedUser
      .mockResolvedValueOnce({
        data: [
          { owner: { login: "LanNguyenSi" }, name: "lava-memories" },
          { owner: { login: "lavaclawdbot" }, name: "lava-memories" },
          { owner: { login: "LanNguyenSi" }, name: "project-os" },
          { owner: { login: "lavaclawdbot" }, name: "ops-bot-private" },
        ],
      })
      .mockResolvedValueOnce({ data: [] });

    mockOctokit.repos.get.mockImplementation(({ owner, repo }: { owner: string; repo: string }) =>
      Promise.resolve({
        data: {
          default_branch: "main",
          html_url: `https://github.com/${owner}/${repo}`,
          updated_at: "2024-01-01T00:00:00Z",
          description: null,
          stargazers_count: 0,
          language: null,
          pushed_at: "2024-01-01T00:00:00Z",
        },
      })
    );
    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({ data: { workflow_runs: [] } });
    mockOctokit.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } });
    mockOctokit.request.mockResolvedValue({ data: [] });

    const snapshot = await getAllRepos("LanNguyenSi");

    expect(snapshot.repos).toHaveLength(2);
    const fullNames = snapshot.repos.map((r) => r.full_name).sort();
    expect(fullNames).toEqual(["LanNguyenSi/lava-memories", "LanNguyenSi/project-os"]);
    // The lavaclawdbot owner must not appear at all.
    expect(
      snapshot.repos.some((r) => r.owner === "lavaclawdbot"),
    ).toBe(false);
  });

  it("owner comparison is case-insensitive", async () => {
    mockOctokit.repos.listForAuthenticatedUser.mockReset();
    mockOctokit.repos.listForAuthenticatedUser
      .mockResolvedValueOnce({
        data: [
          { owner: { login: "LanNguyenSi" }, name: "alpha" },
          { owner: { login: "lannguyensi" }, name: "beta" },
        ],
      })
      .mockResolvedValueOnce({ data: [] });

    mockOctokit.repos.get.mockImplementation(({ owner, repo }: { owner: string; repo: string }) =>
      Promise.resolve({
        data: {
          default_branch: "main",
          html_url: `https://github.com/${owner}/${repo}`,
          updated_at: "2024-01-01T00:00:00Z",
        },
      })
    );
    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({ data: { workflow_runs: [] } });
    mockOctokit.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } });
    mockOctokit.request.mockResolvedValue({ data: [] });

    const snapshot = await getAllRepos("LANNGUYENSI");
    expect(snapshot.repos).toHaveLength(2);
  });

  it("populates full_name server-side as `${owner}/${repo}`", async () => {
    mockOctokit.repos.get.mockResolvedValue({
      data: {
        default_branch: "main",
        html_url: "https://github.com/acme/widgets",
        updated_at: "2024-01-01T00:00:00Z",
      },
    });
    mockOctokit.pulls.list.mockResolvedValue({ data: [] });
    mockOctokit.actions.listWorkflowRunsForRepo.mockResolvedValue({ data: { workflow_runs: [] } });
    mockOctokit.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } });
    mockOctokit.request.mockResolvedValue({ data: [] });

    const health = await getRepoHealth("acme", "widgets");
    expect(health.full_name).toBe("acme/widgets");
  });

  it("fetches all user repos with pagination and caches the snapshot", async () => {
    // Force the fallback path: drain any queued responses on the
    // primary endpoint so listAllReposForUser fails over to listForUser.
    mockOctokit.repos.listForAuthenticatedUser.mockReset();
    mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue(new Error("no auth user path"));
    mockOctokit.repos.listForUser.mockReset();
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
    mockOctokit.request.mockResolvedValue({ data: [] });

    const first = await getAllRepos("test");
    const second = await getAllRepos("test");

    expect(first.repos).toHaveLength(2);
    expect(first.cacheState).toBe("miss");
    expect(second.cacheState).toBe("hit");
    expect(mockOctokit.repos.listForUser).toHaveBeenCalledTimes(1);
  });
});
