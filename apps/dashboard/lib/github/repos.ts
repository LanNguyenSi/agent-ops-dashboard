import { getOctokit } from "./client";
import { getOrRefreshCache } from "./cache";
import type {
  RepoFilter,
  RepoHealth,
  RepoHealthSnapshot,
  RepoOrder,
  RepoQueryOptions,
  RepoSort,
  WorkflowRun,
} from "./types";

const REPO_CACHE_TTL_MS = 5 * 60 * 1000;
const REPO_BATCH_SIZE = 10;
const EMPTY_VULNERABILITY_SUMMARY = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
} as const;

type VulnerabilitySeverity = keyof Omit<typeof EMPTY_VULNERABILITY_SUMMARY, "total">;

interface DependabotAlert {
  security_advisory?: {
    severity?: string | null;
  } | null;
  security_vulnerability?: {
    severity?: string | null;
  } | null;
}

const DEFAULT_QUERY_OPTIONS: RepoQueryOptions = {
  limit: 10,
  page: 1,
  sort: "updated",
  order: "desc",
  filter: "all",
};

export async function getRepoHealth(owner: string, repo: string): Promise<RepoHealth> {
  const octokit = getOctokit();
  
  try {
    // Get repository info
    const { data: repository } = await octokit.repos.get({ owner, repo });

    const [
      { data: prs },
      { data: workflowRuns },
      { data: checkRuns },
      vulnerabilities,
    ] = await Promise.all([
      // TODO: Add pagination support for repos with >100 open PRs
      octokit.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 100,
      }),
      octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 1,
        status: "completed",
      }),
      octokit.checks.listForRef({
        owner,
        repo,
        ref: repository.default_branch,
        per_page: 100,
      }),
      getDependabotVulnerabilities(owner, repo),
    ]);

    const lastRun = workflowRuns.workflow_runs[0] || null;
    const failingChecks = checkRuns.check_runs.filter(
      (check) => check.conclusion === "failure"
    );
    
    // Determine CI status
    let ci_status: RepoHealth["ci_status"] = "unknown";
    if (lastRun) {
      if (lastRun.conclusion === "success") {
        ci_status = "success";
      } else if (lastRun.conclusion === "failure") {
        ci_status = "failure";
      } else if (lastRun.status === "in_progress" || lastRun.status === "queued") {
        ci_status = "pending";
      }
    }
    
    return {
      owner,
      repo,
      default_branch: repository.default_branch,
      html_url: repository.html_url,
      ci_status,
      open_pr_count: prs.length,
      failing_checks_count: failingChecks.length,
      last_workflow_run: lastRun as WorkflowRun | null,
      updated_at: repository.updated_at,
      description: repository.description,
      stars: repository.stargazers_count,
      language: repository.language,
      pushed_at: repository.pushed_at,
      vulnerabilities,
    };
  } catch (error: any) {
    // Handle rate limiting (429 Too Many Requests or 403 Forbidden with rate limit)
    if (error.status === 429 || (error.status === 403 && error.response?.headers["x-ratelimit-remaining"] === "0")) {
      const resetTime = error.response?.headers["x-ratelimit-reset"];
      throw new Error(`Rate limited. Reset at ${new Date(resetTime * 1000)}`);
    }
    throw error;
  }
}

export async function getAllRepos(owner: string): Promise<{
  repos: RepoHealth[];
  errors: string[];
  fetchedAt: string;
  cacheState: "hit" | "miss" | "stale";
}> {
  const { value, cacheState, updatedAt } = await getOrRefreshCache<RepoHealthSnapshot>(
    `github-repos-${owner}`,
    REPO_CACHE_TTL_MS,
    async () => {
      const repos = await listAllReposForUser(owner);
      const results = await mapInBatches(repos, REPO_BATCH_SIZE, async ({ owner, repo }) =>
        getRepoHealth(owner, repo)
      );

      const healthyRepos = results
        .filter((result): result is PromiseFulfilledResult<RepoHealth> => result.status === "fulfilled")
        .map((result) => result.value);

      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => {
          const reason = result.reason;
          return reason instanceof Error ? reason.message : String(reason);
        });

      return {
        repos: healthyRepos,
        errors,
        fetchedAt: new Date().toISOString(),
      };
    }
  );

  return {
    repos: value.repos,
    errors: value.errors,
    fetchedAt: value.fetchedAt || new Date(updatedAt).toISOString(),
    cacheState,
  };
}

export function normalizeRepoQuery(raw: Partial<Record<keyof RepoQueryOptions, string | number | undefined>>): RepoQueryOptions {
  const limit = parseLimit(raw.limit);
  const page = parsePage(raw.page);
  const sort = parseSort(raw.sort);
  const order = parseOrder(raw.order);
  const filter = parseFilter(raw.filter);
  const language = typeof raw.language === "string" && raw.language.trim() ? raw.language.trim() : undefined;

  return {
    limit,
    page,
    sort,
    order,
    filter,
    language,
  };
}

export function applyRepoQuery(repos: RepoHealth[], options: RepoQueryOptions): RepoHealth[] {
  let filtered = repos.slice();

  if (options.filter === "failing") {
    filtered = filtered.filter(
      (repo) => repo.ci_status === "failure" || repo.failing_checks_count > 0
    );
  }

  if (options.filter === "open_prs") {
    filtered = filtered.filter((repo) => repo.open_pr_count > 0);
  }

  if (options.filter === "vulnerable") {
    filtered = filtered.filter((repo) => (repo.vulnerabilities?.total ?? 0) > 0);
  }

  if (options.language) {
    const expected = options.language.toLowerCase();
    filtered = filtered.filter((repo) => repo.language?.toLowerCase() === expected);
  }

  filtered.sort((left, right) => compareRepos(left, right, options.sort, options.order));

  if (options.limit === "all") {
    return filtered;
  }

  return filtered.slice(0, options.limit);
}

export function paginateRepos<T>(items: T[], page: number, limit: number | "all") {
  if (limit === "all") {
    return {
      items,
      page: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      rangeStart: items.length === 0 ? 0 : 1,
      rangeEnd: items.length,
    };
  }

  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const pagedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: pagedItems,
    page: safePage,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    rangeStart: pagedItems.length === 0 ? 0 : startIndex + 1,
    rangeEnd: pagedItems.length === 0 ? 0 : startIndex + pagedItems.length,
  };
}

export function resolveRepoOwner(explicitOwner?: string): string {
  if (explicitOwner?.trim()) {
    return explicitOwner.trim();
  }

  const envOwner = process.env.GITHUB_OWNER?.trim();
  if (envOwner) {
    return envOwner;
  }

  const reposEnv = process.env.GITHUB_REPOS;
  if (reposEnv) {
    const owners = new Set(
      reposEnv
        .split(",")
        .map((entry) => entry.trim().split("/")[0])
        .filter(Boolean)
    );

    if (owners.size === 1) {
      return [...owners][0];
    }
  }

  return "LanNguyenSi";
}

async function listAllReposForUser(owner: string): Promise<Array<{ owner: string; repo: string }>> {
  const octokit = getOctokit();
  const repos: Array<{ owner: string; repo: string }> = [];
  let page = 1;

  // Try authenticated endpoint first (includes private repos)
  // Falls back to public-only listForUser if token doesn't match owner
  try {
    while (true) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        per_page: 100,
        page,
      });

      repos.push(
        ...data.map((r) => ({ owner: r.owner.login, repo: r.name }))
      );

      if (data.length < 100) break;
      page += 1;
    }

    if (repos.length > 0) return repos;
  } catch {
    // Token doesn't support authenticated user listing — fall through
  }

  // Fallback: public repos only
  page = 1;
  while (true) {
    const { data } = await octokit.repos.listForUser({
      username: owner,
      sort: "updated",
      direction: "desc",
      per_page: 100,
      page,
      type: "owner",
    });

    repos.push(
      ...data.map((r) => ({ owner: r.owner.login, repo: r.name }))
    );

    if (data.length < 100) break;
    page += 1;
  }

  return repos;
}

async function mapInBatches<T, U>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<U>
): Promise<Array<PromiseSettledResult<U>>> {
  const results: Array<PromiseSettledResult<U>> = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.allSettled(batch.map((item) => mapper(item)));
    results.push(...batchResults);
  }

  return results;
}

function parseLimit(rawLimit: string | number | undefined): number | "all" {
  if (rawLimit === undefined) {
    return DEFAULT_QUERY_OPTIONS.limit;
  }

  if (rawLimit === "all") {
    return "all";
  }

  const parsed = typeof rawLimit === "number" ? rawLimit : Number.parseInt(rawLimit, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("Invalid limit. Use 1-100 or 'all'.");
  }

  return parsed;
}

function parsePage(rawPage: string | number | undefined): number {
  if (rawPage === undefined) {
    return DEFAULT_QUERY_OPTIONS.page;
  }

  const parsed = typeof rawPage === "number" ? rawPage : Number.parseInt(rawPage, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Invalid page. Use an integer >= 1.");
  }

  return parsed;
}

function parseSort(rawSort: string | number | undefined): RepoSort {
  if (rawSort === undefined) {
    return DEFAULT_QUERY_OPTIONS.sort;
  }

  const sort = String(rawSort);
  if (sort === "updated" || sort === "stars" || sort === "name" || sort === "ci_status") {
    return sort;
  }

  throw new Error("Invalid sort. Use updated, stars, name, or ci_status.");
}

function parseOrder(rawOrder: string | number | undefined): RepoOrder {
  if (rawOrder === undefined) {
    return DEFAULT_QUERY_OPTIONS.order;
  }

  const order = String(rawOrder);
  if (order === "asc" || order === "desc") {
    return order;
  }

  throw new Error("Invalid order. Use asc or desc.");
}

function parseFilter(rawFilter: string | number | undefined): RepoFilter {
  if (rawFilter === undefined) {
    return DEFAULT_QUERY_OPTIONS.filter;
  }

  const filter = String(rawFilter);
  if (filter === "all" || filter === "failing" || filter === "open_prs" || filter === "vulnerable") {
    return filter;
  }

  throw new Error("Invalid filter. Use all, failing, open_prs, or vulnerable.");
}

function compareRepos(left: RepoHealth, right: RepoHealth, sort: RepoSort, order: RepoOrder): number {
  const direction = order === "asc" ? 1 : -1;

  if (sort === "name") {
    return left.repo.localeCompare(right.repo) * direction;
  }

  if (sort === "stars") {
    return ((left.stars ?? 0) - (right.stars ?? 0)) * direction;
  }

  if (sort === "ci_status") {
    return (rankCiStatus(left.ci_status) - rankCiStatus(right.ci_status)) * direction;
  }

  return (
    (new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime()) * direction
  );
}

function rankCiStatus(status: RepoHealth["ci_status"]): number {
  switch (status) {
    case "success":
      return 0;
    case "unknown":
      return 1;
    case "pending":
      return 2;
    case "failure":
      return 3;
  }
}

async function getDependabotVulnerabilities(owner: string, repo: string): Promise<RepoHealth["vulnerabilities"]> {
  const octokit = getOctokit();

  try {
    const response = await octokit.request("GET /repos/{owner}/{repo}/dependabot/alerts", {
      owner,
      repo,
      state: "open",
      per_page: 100,
    });

    const summary = { ...EMPTY_VULNERABILITY_SUMMARY };
    for (const alert of response.data as DependabotAlert[]) {
      const severity = normalizeVulnerabilitySeverity(
        alert.security_advisory?.severity ?? alert.security_vulnerability?.severity
      );

      if (!severity) {
        continue;
      }

      summary.total += 1;
      summary[severity] += 1;
    }

    return summary;
  } catch (error: any) {
    if (error.status === 403 && error.response?.headers["x-ratelimit-remaining"] === "0") {
      throw error;
    }

    if (error.status === 403 || error.status === 404) {
      return undefined;
    }

    throw error;
  }
}

function normalizeVulnerabilitySeverity(rawSeverity: string | null | undefined): VulnerabilitySeverity | null {
  if (!rawSeverity) {
    return null;
  }

  const severity = rawSeverity.toLowerCase();
  if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") {
    return severity;
  }

  return null;
}
