#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { startServer } from "./server.js";

export async function main(): Promise<void> {
  try {
    const config = loadConfig();
    await startServer(config);
  } catch (err) {
    console.error("[opentriologue-mcp] Fatal error:", err);
    process.exit(1);
  }
}

// This package has no "type": "module" in package.json, so tsc compiles it
// to CommonJS (confirmed: `import.meta` is rejected by tsc here with
// TS1470 "not allowed in files which will build into CommonJS output").
// The CommonJS main-module idiom is therefore `require.main === module`,
// which is also what makes this file safely importable in tests (it
// resolves to `false` under vitest/vite-node, so importing never
// auto-invokes main()).
if (require.main === module) {
  main();
}
