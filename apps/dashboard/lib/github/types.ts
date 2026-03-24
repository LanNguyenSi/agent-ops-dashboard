export interface CheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | "stale" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
}

export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  draft: boolean;
  mergeable_state?: string;
}

export interface RepoHealth {
  owner: string;
  repo: string;
  default_branch: string;
  html_url: string;
  ci_status: "success" | "failure" | "pending" | "unknown";
  open_pr_count: number;
  failing_checks_count: number;
  last_workflow_run: WorkflowRun | null;
  updated_at: string;
  // Extended info
  description?: string | null;
  stars?: number;
  language?: string | null;
  pushed_at?: string | null;
}

export type RepoSort = "updated" | "stars" | "name" | "ci_status";
export type RepoOrder = "asc" | "desc";
export type RepoFilter = "all" | "failing" | "open_prs";

export interface RepoQueryOptions {
  limit: number | "all";
  page: number;
  sort: RepoSort;
  order: RepoOrder;
  filter: RepoFilter;
  language?: string;
}

export interface RepoHealthSnapshot {
  repos: RepoHealth[];
  errors: string[];
  fetchedAt: string;
}

export interface RepoHealthResponse {
  repos: RepoHealth[];
  errors?: string[];
  meta: {
    owner: string;
    total: number;
    filtered: number;
    returned: number;
    limit: number | "all";
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    rangeStart: number;
    rangeEnd: number;
    sort: RepoSort;
    order: RepoOrder;
    filter: RepoFilter;
    language?: string;
    cache: "hit" | "miss" | "stale";
    fetchedAt: string;
  };
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}
