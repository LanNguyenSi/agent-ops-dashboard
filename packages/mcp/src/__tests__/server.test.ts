import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConnect, mockMcpServerCtor, mockStdioServerTransportCtor, mockRegisterAgentTools, mockRegisterStateTools } =
  vi.hoisted(() => {
    const mockConnect = vi.fn();
    const mockMcpServerCtor = vi.fn().mockImplementation(function (this: any) {
      this.connect = mockConnect;
    });
    const mockStdioServerTransportCtor = vi.fn().mockImplementation(function (this: any) {});
    const mockRegisterAgentTools = vi.fn();
    const mockRegisterStateTools = vi.fn();
    return {
      mockConnect,
      mockMcpServerCtor,
      mockStdioServerTransportCtor,
      mockRegisterAgentTools,
      mockRegisterStateTools,
    };
  });

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: mockMcpServerCtor,
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: mockStdioServerTransportCtor,
}));

vi.mock("../tools/agents.js", () => ({
  registerAgentTools: (...args: unknown[]) => mockRegisterAgentTools(...args),
}));
vi.mock("../tools/state.js", () => ({
  registerStateTools: (...args: unknown[]) => mockRegisterStateTools(...args),
}));

import { createServer, startServer } from "../server.js";
import type { Config } from "../config.js";

const config: Config = { gatewayUrl: "http://gateway:3001", gatewayToken: undefined, agentId: undefined };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createServer", () => {
  it("constructs McpServer with name opentriologue and registers both tool groups", async () => {
    const server = await createServer(config);

    expect(mockMcpServerCtor).toHaveBeenCalledWith(
      expect.objectContaining({ name: "opentriologue" })
    );
    expect(mockRegisterAgentTools).toHaveBeenCalledWith(server, expect.any(Object), config);
    expect(mockRegisterStateTools).toHaveBeenCalledWith(server, expect.any(Object), config);
  });

  it("returns the constructed server instance", async () => {
    const server = await createServer(config);
    expect(server).toEqual({ connect: mockConnect });
  });
});

describe("startServer", () => {
  it("builds a StdioServerTransport and connects the server to it", async () => {
    await startServer(config);

    expect(mockStdioServerTransportCtor).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledWith(expect.any(Object));
  });
});
