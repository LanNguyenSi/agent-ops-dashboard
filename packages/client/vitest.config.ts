import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // 2026-07-01: scoped `include` to src/** so untested files are
      // counted (at 0%) instead of being invisible to the gate. (No
      // separate `all: true` flag: @vitest/coverage-v8@4.1.9 removed that
      // option from CoverageV8Options — `include` alone now yields the same
      // "count every matching file" behavior; verified the measured
      // numbers are identical with/without the flag.) cli.ts now has a
      // main-module guard (require.main === module) so it is safely
      // import- and behavior-testable; index.ts is a thin re-export barrel
      // with no branches of its own. Floor locked just below the measured
      // baseline under this wider scope (lines 71.42 / stmts 69.82 / funcs
      // 86.66 / branches 53.57) so a new untested file drops the gate.
      // Raise as coverage improves.
      include: ["src/**"],
      exclude: [
        "**/*.test.ts",
        "**/__tests__/**",
        "**/*.config.*",
        "**/types.ts",
      ],
      thresholds: {
        lines: 70,
        statements: 68,
        functions: 85,
        branches: 52,
      },
    },
  },
});
