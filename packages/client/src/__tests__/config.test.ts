/**
 * Tests for packages/client/src/config.ts
 *
 * CONFIG_DIR, CONFIG_FILE, and DEFAULT_CONFIG are all top-level module consts
 * evaluated at import time. We therefore:
 *   1. Call vi.resetModules() in beforeEach to clear the module cache.
 *   2. Set process.env.HOME (and any relevant env vars) before the dynamic
 *      import so that os.homedir() and env reads pick up the test values.
 *   3. Use a per-test temp dir derived from os.tmpdir() so we never touch
 *      the real ~/.agent-ops.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tmpDir: string;
let originalHome: string | undefined;
let counter = 0;

beforeEach(() => {
  counter += 1;
  tmpDir = path.join(os.tmpdir(), `agent-ops-config-test-${process.pid}-${counter}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // Redirect os.homedir() for this test by overriding HOME
  originalHome = process.env["HOME"];
  process.env["HOME"] = tmpDir;

  // Clear the module cache so that config.ts is re-evaluated on next import
  vi.resetModules();
});

afterEach(() => {
  // Restore HOME
  if (originalHome === undefined) {
    delete process.env["HOME"];
  } else {
    process.env["HOME"] = originalHome;
  }

  // Remove leftover env overrides
  delete process.env["AGENT_OPS_GATEWAY_URL"];
  delete process.env["AGENT_OPS_GATEWAY_TOKEN"];

  // Clean up the isolated temp dir
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("loadConfig — no file present", () => {
  it("returns the default gatewayUrl when AGENT_OPS_GATEWAY_URL is not set", async () => {
    delete process.env["AGENT_OPS_GATEWAY_URL"];
    const { loadConfig } = await import("../config");

    const config = loadConfig();

    expect(config.gatewayUrl).toBe("http://localhost:3001");
  });

  it("returns undefined gatewayToken when AGENT_OPS_GATEWAY_TOKEN is not set", async () => {
    delete process.env["AGENT_OPS_GATEWAY_TOKEN"];
    const { loadConfig } = await import("../config");

    const config = loadConfig();

    expect(config.gatewayToken).toBeUndefined();
  });
});

describe("loadConfig — env var overrides", () => {
  it("reflects AGENT_OPS_GATEWAY_URL in the default config", async () => {
    process.env["AGENT_OPS_GATEWAY_URL"] = "http://custom-gateway:4000";
    const { loadConfig } = await import("../config");

    const config = loadConfig();

    expect(config.gatewayUrl).toBe("http://custom-gateway:4000");
  });

  it("reflects AGENT_OPS_GATEWAY_TOKEN in the default config", async () => {
    process.env["AGENT_OPS_GATEWAY_TOKEN"] = "env-token-abc123";
    const { loadConfig } = await import("../config");

    const config = loadConfig();

    expect(config.gatewayToken).toBe("env-token-abc123");
  });
});

describe("saveConfig + loadConfig round-trip", () => {
  it("persists gatewayUrl and gatewayToken through a write/read cycle", async () => {
    const { saveConfig, loadConfig } = await import("../config");

    saveConfig({ gatewayUrl: "http://my-gateway:9999", gatewayToken: "round-trip-token" });
    const config = loadConfig();

    expect(config.gatewayUrl).toBe("http://my-gateway:9999");
    expect(config.gatewayToken).toBe("round-trip-token");
  });

  it("merges partial updates with existing values", async () => {
    const { saveConfig, loadConfig } = await import("../config");

    saveConfig({ gatewayUrl: "http://first:1111" });
    saveConfig({ gatewayToken: "second-write" });

    const config = loadConfig();

    expect(config.gatewayUrl).toBe("http://first:1111");
    expect(config.gatewayToken).toBe("second-write");
  });

  it("the saved file exists at the expected path after saveConfig", async () => {
    const { saveConfig, getConfigPath } = await import("../config");

    saveConfig({ gatewayUrl: "http://persist-check:1234" });

    expect(fs.existsSync(getConfigPath())).toBe(true);
  });
});

describe("ensureConfigDir", () => {
  it("creates the .agent-ops directory when it does not exist", async () => {
    const { ensureConfigDir } = await import("../config");

    const expectedDir = path.join(tmpDir, ".agent-ops");
    expect(fs.existsSync(expectedDir)).toBe(false);

    ensureConfigDir();

    expect(fs.existsSync(expectedDir)).toBe(true);
  });

  it("does not throw if the directory already exists", async () => {
    const { ensureConfigDir } = await import("../config");

    // Create it once
    ensureConfigDir();
    // Second call must be idempotent
    expect(() => ensureConfigDir()).not.toThrow();
  });
});

describe("getConfigPath", () => {
  it("returns a path that contains .agent-ops and config.json", async () => {
    const { getConfigPath } = await import("../config");

    const configPath = getConfigPath();

    expect(configPath).toContain(".agent-ops");
    expect(configPath).toContain("config.json");
  });

  it("is rooted under the configured HOME directory", async () => {
    const { getConfigPath } = await import("../config");

    const configPath = getConfigPath();

    expect(configPath.startsWith(tmpDir)).toBe(true);
  });
});

describe("loadConfig — corrupt file falls back to defaults", () => {
  it("returns defaults instead of throwing when config.json is not valid JSON", async () => {
    // Pre-create the dir and write garbage before importing the module
    const configDir = path.join(tmpDir, ".agent-ops");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "config.json"), "NOT_VALID_JSON_{{{", "utf-8");

    const { loadConfig } = await import("../config");

    let config: Awaited<ReturnType<typeof loadConfig>>;
    expect(() => {
      config = loadConfig();
    }).not.toThrow();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(config!.gatewayUrl).toBe("http://localhost:3001");
  });
});
