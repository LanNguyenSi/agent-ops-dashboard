import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAgentTools } from "../tools/agents.js";
import { registerStateTools } from "../tools/state.js";
import type { GatewayClient } from "../client.js";
import type { Config } from "../config.js";

/**
 * Runtime test against a REAL McpServer — no `vi.mock` on
 * `@modelcontextprotocol/sdk`. Every other test file in this package mocks
 * `McpServer.tool()` and invokes the captured handler with raw args
 * directly, so the zod input schemas are constructed but never actually
 * parsed or converted to JSON Schema. This file registers the real tools on
 * a real `McpServer`, connects a real SDK `Client` to it over
 * `InMemoryTransport`, and drives everything through `tools/list` and
 * `tools/call` so both the zod->JSON-Schema conversion and zod's runtime
 * argument parsing execute for real.
 *
 * Context: PR #75 migrated this package from zod ^3 to ^4. Under zod 4 the
 * SDK's schema converter (`zod-json-schema-compat.js`, `zod/v4-mini`
 * `toJSONSchema`) no longer emits `additionalProperties: false`, and
 * `z.record` schemas gain `propertyNames`. See task e64595ed and the
 * CHANGELOG [Unreleased] entry for the zod-4 schema delta. tsc alone cannot
 * catch this kind of drift — a JSON Schema shape change is not a type
 * error — so the `tools/list` output itself is pinned below.
 */

type ToolCallResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    gatewayUrl: "http://gateway:3001",
    gatewayToken: undefined,
    agentId: "default-agent",
    ...overrides,
  };
}

function makeGatewayClient(overrides: Partial<GatewayClient> = {}): GatewayClient {
  return {
    registerAgent: vi.fn(),
    sendHeartbeat: vi.fn(),
    getAgent: vi.fn(),
    listAgents: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
    casState: vi.fn(),
    listState: vi.fn(),
    deleteState: vi.fn(),
    ...overrides,
  } as unknown as GatewayClient;
}

/** Registers the real tool groups on a real McpServer and connects a real
 * SDK Client to it over a linked in-memory transport pair. */
async function connectRealServerAndClient(config: Config, gatewayClient: GatewayClient) {
  const server = new McpServer({ name: "opentriologue", version: "0.1.0" });
  registerAgentTools(server, gatewayClient, config);
  registerStateTools(server, gatewayClient, config);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "mcp-runtime-test-client", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

describe("packages/mcp real McpServer runtime (no SDK mocks)", () => {
  it("advertises the ops_heartbeat inputSchema produced by the real zod->JSON-Schema conversion", async () => {
    const { client } = await connectRealServerAndClient(makeConfig(), makeGatewayClient());
    const { tools } = await client.listTools();
    const heartbeat = tools.find((t) => t.name === "ops_heartbeat");
    expect(heartbeat).toBeDefined();

    expect(heartbeat!.inputSchema).toEqual({
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "Agent ID to send heartbeat for. Defaults to AGENT_ID env var if set.",
        },
        status: {
          type: "string",
          enum: ["online", "busy", "idle"],
          default: "online",
          description: "Current agent status",
        },
      },
      $schema: "http://json-schema.org/draft-07/schema#",
    });

    // Known zod-4 delta (CHANGELOG [Unreleased], reviewer finding on PR
    // #75): the object schema no longer advertises `additionalProperties:
    // false` or a top-level `required` list here. Pinning the *absence*
    // explicitly so a future SDK/zod bump that changes this again fails
    // this test instead of silently drifting.
    expect(heartbeat!.inputSchema).not.toHaveProperty("additionalProperties");
    expect(heartbeat!.inputSchema.required).toBeUndefined();
  });

  it("advertises the ops_state_set inputSchema, including the zod-4 z.record propertyNames delta", async () => {
    const { client } = await connectRealServerAndClient(makeConfig(), makeGatewayClient());
    const { tools } = await client.listTools();
    const stateSet = tools.find((t) => t.name === "ops_state_set");
    expect(stateSet).toBeDefined();

    expect(stateSet!.inputSchema).toEqual({
      type: "object",
      properties: {
        namespace: { type: "string", minLength: 1, description: "Namespace to scope the key" },
        key: { type: "string", minLength: 1, description: "The key to set" },
        value: {
          type: "object",
          propertyNames: { type: "string" },
          additionalProperties: {},
          description: "JSON object value to store",
        },
        updatedBy: {
          type: "string",
          description: "Optional: who is setting this (e.g. your agent ID)",
        },
      },
      required: ["namespace", "key", "value"],
      $schema: "http://json-schema.org/draft-07/schema#",
    });
  });

  it("ops_heartbeat called with {} takes the .optional().default() path and reports status 'online'", async () => {
    const gatewayClient = makeGatewayClient({ sendHeartbeat: vi.fn().mockResolvedValue(undefined) });
    const { client } = await connectRealServerAndClient(makeConfig(), gatewayClient);

    const result = (await client.callTool({ name: "ops_heartbeat", arguments: {} })) as ToolCallResult;

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.status).toBe("online");
    expect(data.agentId).toBe("default-agent");
    expect(gatewayClient.sendHeartbeat).toHaveBeenCalledWith("default-agent", "online");
  });

  it.each([
    ["null", null],
    ["an array", [1, 2, 3]],
    ["a string", "not-an-object"],
  ])("ops_state_set rejects a value of %s through the real schema", async (_label, value) => {
    const gatewayClient = makeGatewayClient();
    const { client } = await connectRealServerAndClient(makeConfig(), gatewayClient);

    const result = (await client.callTool({
      name: "ops_state_set",
      arguments: { namespace: "ns", key: "k", value },
    })) as ToolCallResult;

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid arguments for tool ops_state_set");
    expect(gatewayClient.setState).not.toHaveBeenCalled();
  });

  it("ops_state_set accepts a real object value and reaches the gateway client", async () => {
    const gatewayClient = makeGatewayClient({
      setState: vi.fn().mockResolvedValue({
        namespace: "ns",
        key: "k",
        value: { a: 1 },
        version: 1,
        updatedBy: undefined,
        updatedAt: "2026-01-01",
      }),
    });
    const { client } = await connectRealServerAndClient(makeConfig(), gatewayClient);

    const result = (await client.callTool({
      name: "ops_state_set",
      arguments: { namespace: "ns", key: "k", value: { a: 1 } },
    })) as ToolCallResult;

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.success).toBe(true);
    expect(data.version).toBe(1);
    expect(gatewayClient.setState).toHaveBeenCalledWith("ns", "k", { a: 1 }, undefined);
  });
});
