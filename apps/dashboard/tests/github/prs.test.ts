import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Octokit } from "@octokit/rest";
import { getOpenPRs } from "@/lib/github/prs";
import * as client from "@/lib/github/client";

// Mock Octokit — same spy pattern proven in tests/github/repos.test.ts.
const mockOctokit = {
  pulls: {
    list: vi.fn(),
  },
};

describe("getOpenPRs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(client, "getOctokit").mockReturnValue(mockOctokit as unknown as Octokit);
  });

  it("normalizes a fully-populated PR", async () => {
    mockOctokit.pulls.list.mockResolvedValue({
      data: [
        {
          number: 42,
          title: "Add feature",
          html_url: "https://github.com/acme/widgets/pull/42",
          state: "open",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          user: { login: "octocat", avatar_url: "https://avatars/octocat.png" },
          head: { ref: "feature", sha: "abc123" },
          base: { ref: "main" },
          draft: true,
          mergeable_state: "clean",
        },
      ],
    });

    const result = await getOpenPRs("acme", "widgets");

    expect(result).toEqual([
      {
        number: 42,
        title: "Add feature",
        html_url: "https://github.com/acme/widgets/pull/42",
        state: "open",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        user: { login: "octocat", avatar_url: "https://avatars/octocat.png" },
        head: { ref: "feature", sha: "abc123" },
        base: { ref: "main" },
        draft: true,
        mergeable_state: "clean",
      },
    ]);

    expect(mockOctokit.pulls.list).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "acme", repo: "widgets", state: "open", per_page: 100 })
    );
  });

  it("falls back user to unknown/empty avatar, draft to false, and mergeable_state to undefined when missing", async () => {
    mockOctokit.pulls.list.mockResolvedValue({
      data: [
        {
          number: 7,
          title: "Fix bug",
          html_url: "https://github.com/acme/widgets/pull/7",
          state: "open",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          user: null,
          head: { ref: "fix", sha: "def456" },
          base: { ref: "main" },
          // draft / mergeable_state intentionally absent
        },
      ],
    });

    const result = await getOpenPRs("acme", "widgets");

    expect(result).toHaveLength(1);
    expect(result[0]?.user).toEqual({ login: "unknown", avatar_url: "" });
    expect(result[0]?.draft).toBe(false);
    expect(result[0]?.mergeable_state).toBeUndefined();
  });
});
