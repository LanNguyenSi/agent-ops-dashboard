import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoadConfig = vi.fn();
const mockStartServer = vi.fn();

vi.mock("../config.js", () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}));
vi.mock("../server.js", () => ({
  startServer: (...args: unknown[]) => mockStartServer(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("main-module guard", () => {
  it("does not invoke startServer merely by importing the module", async () => {
    mockLoadConfig.mockReturnValue({ gatewayUrl: "http://gw" });
    await import("../index.js");
    expect(mockStartServer).not.toHaveBeenCalled();
  });
});

describe("main()", () => {
  it("loads config and starts the server without exiting on success", async () => {
    mockLoadConfig.mockReturnValue({ gatewayUrl: "http://gw" });
    mockStartServer.mockResolvedValue(undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit should not be called");
    });

    const { main } = await import("../index.js");
    await main();

    expect(mockStartServer).toHaveBeenCalledWith({ gatewayUrl: "http://gw" });
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("logs the error and exits(1) when startServer rejects", async () => {
    mockLoadConfig.mockReturnValue({ gatewayUrl: "http://gw" });
    const err = new Error("boom");
    mockStartServer.mockRejectedValue(err);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("EXIT");
    });

    const { main } = await import("../index.js");
    await expect(main()).rejects.toThrow("EXIT");

    expect(errorSpy).toHaveBeenCalledWith("[opentriologue-mcp] Fatal error:", err);
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
