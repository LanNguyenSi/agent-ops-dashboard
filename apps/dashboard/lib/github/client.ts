import { Octokit } from "@octokit/rest";

let octokitInstance: Octokit | null = null;

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    
    octokitInstance = new Octokit({
      auth: token,
      userAgent: "agent-ops-dashboard",
    });
  }
  
  return octokitInstance;
}

// Reset for testing
export function resetOctokit(): void {
  octokitInstance = null;
}
