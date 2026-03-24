import type { PipelineRun } from "./types";

// Mock pipeline data for development/demo
export function getMockPipelineRuns(): PipelineRun[] {
  const now = new Date();
  const runs: PipelineRun[] = [];
  
  // Generate 30 mock runs over the last 7 days
  const repos = ["LanNguyenSi/agent-planforge", "LanNguyenSi/scaffoldkit", "LanNguyenSi/agent-ops-dashboard"];
  const branches = ["main", "develop", "feat/new-feature"];
  const statuses: Array<PipelineRun["status"]> = ["success", "success", "success", "failure", "success", "success"];
  
  for (let i = 0; i < 30; i++) {
    const startedAt = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); // Every 6 hours
    const duration = 60000 + Math.random() * 300000; // 1-5 minutes
    const completedAt = new Date(startedAt.getTime() + duration);
    const status = statuses[i % statuses.length];
    
    runs.push({
      id: 1000 + i,
      name: ["CI", "Build", "Test", "Deploy"][i % 4],
      status,
      conclusion: status === "success" ? "success" : status === "failure" ? "failure" : null,
      repository: repos[i % repos.length],
      branch: branches[i % branches.length],
      commit: `abc${i.toString().padStart(4, "0")}`,
      commitMessage: [
        "feat: add new feature",
        "fix: resolve bug in pipeline",
        "chore: update dependencies",
        "docs: improve README",
      ][i % 4],
      author: ["ice", "lava", "stone"][i % 3],
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      duration,
      htmlUrl: `https://github.com/${repos[i % repos.length]}/actions/runs/${1000 + i}`,
    });
  }
  
  return runs;
}
