import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // `include` alone yields the "count every matching file, even if
      // never imported" behavior in this vitest version (no separate
      // `all: true` flag exists on CoverageV8Options here; verified the
      // measured numbers are the same either way).
      include: ["src/**"],
      exclude: [
        "**/__tests__/**",
        "**/*.config.*",
        "**/types.ts",
        "**/migrations/**",
        "dist/**",
      ],
      // 2026-07-01: first coverage gate for this workspace (previously ran
      // `vitest run` with no coverage at all). Floor locked just below the
      // measured baseline (lines 63.92 / stmts 63.66 / funcs 64.86 /
      // branches 64.28) so a new untested file drops the gate. Raise as
      // coverage improves.
      thresholds: {
        lines: 62,
        statements: 62,
        functions: 63,
        branches: 63,
      },
    },
  },
});
