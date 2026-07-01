/**
 * Dedicated file for the import-safety check: this file must NOT
 * statically import "../cli" anywhere else, so the Command.prototype.parse
 * spy set up below is guaranteed to observe the very first (and only)
 * import of the module in this test file's isolated module graph.
 */
import { describe, it, expect, vi } from "vitest";
import { Command } from "commander";

vi.mock("../api-client", () => ({ AgentOpsClient: vi.fn() }));
vi.mock("../config", () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getConfigPath: vi.fn(),
}));

describe("cli.ts main-module guard", () => {
  it("importing the module does not invoke Command.prototype.parse", async () => {
    const parseSpy = vi.spyOn(Command.prototype, "parse");

    await import("../cli");

    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });
});
