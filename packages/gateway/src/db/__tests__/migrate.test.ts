import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock("../pool.js", () => ({
  getPool: () => ({ query: mockQuery, connect: mockConnect }),
}));

const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

vi.mock("fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

import { runMigrations } from "../migrate.js";

beforeEach(() => {
  vi.resetAllMocks();
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

describe("runMigrations", () => {
  it("creates the _migrations table, skips already-applied files, and applies pending .sql files in sorted order", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("SELECT filename")) {
        return Promise.resolve({ rows: [{ filename: "000_already.sql" }] });
      }
      return Promise.resolve({ rows: [] });
    });
    // Scrambled order, includes a non-.sql file and an already-applied file.
    mockReaddir.mockResolvedValue([
      "003_c.sql",
      "001_a.sql",
      "readme.md",
      "002_b.sql",
      "000_already.sql",
    ]);
    mockReadFile.mockImplementation((path: string) => Promise.resolve(`SQL for ${path}`));
    mockClientQuery.mockResolvedValue({ rows: [] });

    await runMigrations();

    // _migrations table created.
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS _migrations")
    );

    // Only the three pending .sql files are read, in sorted order.
    // (000_already.sql skipped as applied; readme.md filtered as non-.sql)
    expect(mockReadFile.mock.calls.map((c) => c[0])).toEqual([
      expect.stringContaining("001_a.sql"),
      expect.stringContaining("002_b.sql"),
      expect.stringContaining("003_c.sql"),
    ]);

    // Each migration is wrapped BEGIN -> sql -> INSERT -> COMMIT, in order.
    expect(mockClientQuery.mock.calls.map((c) => c[0])).toEqual([
      "BEGIN",
      "SQL for " + mockReadFile.mock.calls[0]?.[0],
      "INSERT INTO _migrations (filename) VALUES ($1)",
      "COMMIT",
      "BEGIN",
      "SQL for " + mockReadFile.mock.calls[1]?.[0],
      "INSERT INTO _migrations (filename) VALUES ($1)",
      "COMMIT",
      "BEGIN",
      "SQL for " + mockReadFile.mock.calls[2]?.[0],
      "INSERT INTO _migrations (filename) VALUES ($1)",
      "COMMIT",
    ]);

    // A fresh client per migration, released each time.
    expect(mockConnect).toHaveBeenCalledTimes(3);
    expect(mockRelease).toHaveBeenCalledTimes(3);
  });

  it("rolls back, releases the client, and throws a descriptive error when a migration statement fails", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("SELECT filename")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
    mockReaddir.mockResolvedValue(["001_bad.sql"]);
    mockReadFile.mockResolvedValue("BROKEN SQL");
    mockClientQuery.mockImplementation((sql: string) => {
      if (sql === "BROKEN SQL") return Promise.reject(new Error("syntax error"));
      return Promise.resolve({ rows: [] });
    });

    await expect(runMigrations()).rejects.toMatchObject({
      message: expect.stringContaining("Migration 001_bad.sql failed:"),
      cause: expect.objectContaining({ message: "syntax error" }),
    });

    expect(mockClientQuery.mock.calls.map((c) => c[0])).toEqual(["BEGIN", "BROKEN SQL", "ROLLBACK"]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
