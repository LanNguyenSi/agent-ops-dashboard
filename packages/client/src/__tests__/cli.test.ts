import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRegister, mockHeartbeat, mockGetAgents, AgentOpsClientCtor } = vi.hoisted(() => {
  const mockRegister = vi.fn();
  const mockHeartbeat = vi.fn();
  const mockGetAgents = vi.fn();
  const AgentOpsClientCtor = vi.fn().mockImplementation(function (this: any) {
    this.register = mockRegister;
    this.heartbeat = mockHeartbeat;
    this.getAgents = mockGetAgents;
  });
  return { mockRegister, mockHeartbeat, mockGetAgents, AgentOpsClientCtor };
});

vi.mock("../api-client", () => ({
  AgentOpsClient: AgentOpsClientCtor,
}));

const mockLoadConfig = vi.fn();
const mockSaveConfig = vi.fn();
const mockGetConfigPath = vi.fn(() => "/fake/.agent-ops/config.json");

vi.mock("../config", () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  getConfigPath: () => mockGetConfigPath(),
}));

// Guard already covered in cli.guard.test.ts (must not be re-imported
// there); safe to statically import here since this file never asserts
// on Command.prototype.parse call counts.
import { program } from "../cli";

const BASE_CONFIG = {
  gatewayUrl: "http://gw:3001",
  gatewayToken: undefined,
  agentId: undefined,
  agentName: undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadConfig.mockReturnValue({ ...BASE_CONFIG });
  mockGetConfigPath.mockReturnValue("/fake/.agent-ops/config.json");
});

describe("register command", () => {
  it("calls client.register with the parsed options and saves the returned agent to config", async () => {
    mockRegister.mockResolvedValue({ id: "a1", name: "x" });

    await program.parseAsync(["node", "agent-ops", "register", "--name", "x"]);

    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ name: "x", tags: [] })
    );
    expect(mockSaveConfig).toHaveBeenCalledWith({ agentId: "a1", agentName: "x" });
  });

  it("errors and exits(1) on invalid JSON in --meta", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("EXIT");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      program.parseAsync(["node", "agent-ops", "register", "--name", "x", "--meta", "{not json"])
    ).rejects.toThrow("EXIT");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockRegister).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("heartbeat command", () => {
  it("errors and exits(1) when no agentId is given and none is saved in config", async () => {
    mockLoadConfig.mockReturnValue({ ...BASE_CONFIG, agentId: undefined });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("EXIT");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(program.parseAsync(["node", "agent-ops", "heartbeat"])).rejects.toThrow("EXIT");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockHeartbeat).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("uses the saved config agentId when no explicit id is passed", async () => {
    mockLoadConfig.mockReturnValue({ ...BASE_CONFIG, agentId: "saved-id" });
    mockHeartbeat.mockResolvedValue({ status: "online" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync(["node", "agent-ops", "heartbeat"]);

    expect(mockHeartbeat).toHaveBeenCalledWith("saved-id", {});
    logSpy.mockRestore();
  });
});

describe("status command", () => {
  it("prints a no-agents message when the agent list is empty", async () => {
    mockGetAgents.mockResolvedValue([]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync(["node", "agent-ops", "status"]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No agents registered"));
    logSpy.mockRestore();
  });
});
