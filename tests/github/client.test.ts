import { describe, it, expect, beforeEach } from "vitest";
import { getOctokit, resetOctokit } from "@/lib/github/client";

describe("GitHub Client", () => {
  beforeEach(() => {
    resetOctokit();
  });
  
  it("throws error when GITHUB_TOKEN is not set", () => {
    delete process.env.GITHUB_TOKEN;
    expect(() => getOctokit()).toThrow("GITHUB_TOKEN environment variable is not set");
  });
  
  it("returns singleton Octokit instance", () => {
    process.env.GITHUB_TOKEN = "test-token";
    const instance1 = getOctokit();
    const instance2 = getOctokit();
    expect(instance1).toBe(instance2);
  });
  
  it("resets instance when resetOctokit is called", () => {
    process.env.GITHUB_TOKEN = "test-token";
    const instance1 = getOctokit();
    resetOctokit();
    const instance2 = getOctokit();
    expect(instance1).not.toBe(instance2);
  });
});
