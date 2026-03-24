import { NextResponse } from "next/server";
import { applyRepoQuery, getAllRepos, normalizeRepoQuery, paginateRepos, resolveRepoOwner } from "@/lib/github/repos";
import type { RepoHealthResponse } from "@/lib/github/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = resolveRepoOwner(searchParams.get("owner") ?? undefined);
    const query = normalizeRepoQuery({
      limit: searchParams.get("limit") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") ?? undefined,
      filter: searchParams.get("filter") ?? undefined,
      language: searchParams.get("language") ?? undefined,
    });

    const snapshot = await getAllRepos(owner);
    const filteredRepos = applyRepoQuery(snapshot.repos, { ...query, limit: "all" });
    const pagination = paginateRepos(filteredRepos, query.page, query.limit);
    const repos = pagination.items;

    const response: RepoHealthResponse = {
      repos,
      errors: snapshot.errors.length > 0 ? snapshot.errors : undefined,
      meta: {
        owner,
        total: snapshot.repos.length,
        filtered: filteredRepos.length,
        returned: repos.length,
        limit: query.limit,
        page: pagination.page,
        totalPages: pagination.totalPages,
        hasPreviousPage: pagination.hasPreviousPage,
        hasNextPage: pagination.hasNextPage,
        rangeStart: pagination.rangeStart,
        rangeEnd: pagination.rangeEnd,
        sort: query.sort,
        order: query.order,
        filter: query.filter,
        language: query.language,
        vulnerableCount: snapshot.repos.filter((repo) => (repo.vulnerabilities?.total ?? 0) > 0).length,
        cache: snapshot.cacheState,
        fetchedAt: snapshot.fetchedAt,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    const status = error.message?.startsWith("Invalid ") ? 400 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch repos" },
      { status }
    );
  }
}
