import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      // 2026-07-01: scoped `include` to lib/**+components/** so untested
      // files are counted (at 0%) instead of being invisible to the gate.
      // (No separate `all: true` flag: @vitest/coverage-v8@4.1.9 removed
      // that option from CoverageV8Options — `include` alone now yields the
      // same "count every matching file" behavior; verified the measured
      // numbers are identical with/without the flag.)
      //
      // 2026-08-16: extended `include` to app/** to close the app-layer
      // hole the SCOPE NOTE above used to describe (see git history for the
      // old note). Every app/api/**/route.ts handler with real logic now
      // has a mutation-tested happy-path + error/edge-case test under
      // tests/api/. Page/layout files (app/page.tsx, app/activity/page.tsx,
      // app/layout.tsx) are excluded below: they are pure JSX composition
      // of already-tested components with no branches or logic of their
      // own, so a render test would only re-assert React's own behavior.
      include: ['lib/**', 'components/**', 'app/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.*',
        '**/types.ts',
        'app/page.tsx',
        'app/activity/page.tsx',
        'app/layout.tsx',
      ],
      thresholds: {
        // Global floors below catch aggregate regressions across the whole
        // lib+components+app coverage set (locked just under the measured
        // baseline: lines 47.75 / stmts 46.71 / funcs 46.84 / branches
        // 35.36). They do NOT reliably catch a single new/untested
        // app/api/**/route.ts handler: against ~1250 total statements, even
        // a 57-line uncovered handler barely dents the aggregate and still
        // clears these floors. The per-glob floor below is what actually
        // catches that case: it is set just under the measured per-file
        // floor across the 15 existing route.ts handlers (88.23 stmts /
        // 86.66 lines / 100 funcs / 50 branches), so any route.ts that
        // ships without its own tests trips this threshold even when the
        // repo-wide aggregate would not notice.
        lines: 46,
        statements: 45,
        functions: 45,
        branches: 34,
        'app/api/**/route.ts': {
          statements: 85,
          lines: 85,
          functions: 100,
          branches: 45,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
