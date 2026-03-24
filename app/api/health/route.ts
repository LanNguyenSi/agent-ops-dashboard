export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Returns application health status and version information
 */
export async function GET() {
  try {
    // Read version from package.json
    const packagePath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    const version = packageJson.version || "unknown";

    // Check environment configuration
    const hasGithubToken = !!process.env.GITHUB_TOKEN;
    const hasGithubRepos = !!process.env.GITHUB_REPOS;

    return NextResponse.json({
      status: "ok",
      version,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      config: {
        githubIntegration: hasGithubToken && hasGithubRepos,
        repos: hasGithubRepos ? process.env.GITHUB_REPOS?.split(",").length : 0,
      },
    });
  } catch (error) {
    // Even if version check fails, return healthy
    // (deployment should not fail on health check)
    return NextResponse.json({
      status: "ok",
      version: "unknown",
      timestamp: new Date().toISOString(),
      error: "Could not read version info",
    });
  }
}
