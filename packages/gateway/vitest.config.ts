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
      // coverage improves. The branches floor is set a touch wider (61, vs
      // measured 64.28) than lines/stmts because with only ~90 total
      // branches a single uncovered defensive branch added by a future
      // refactor would otherwise false-fail CI on a razor-thin margin.
      thresholds: {
        lines: 62,
        statements: 62,
        functions: 63,
        branches: 61,
      },
    },
  },
});
