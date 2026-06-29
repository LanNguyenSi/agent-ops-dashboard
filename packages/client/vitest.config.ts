import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // config.ts + api-client.ts are fully covered (100%). cli.ts is a
      // documented follow-up; it is not import-loaded by the suite (its
      // unconditional program.parse() blocks import-time testing).
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
