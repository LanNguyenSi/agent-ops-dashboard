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
      // Floor locked just below the measured baseline under this wider
      // scope (lines 47.75 / stmts 46.71 / funcs 46.84 / branches 35.36)
      // so a new untested file drops the gate. Raise as coverage improves.
      include: ['lib/**', 'components/**', 'app/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.*',
        '**/types.ts',
        'app/**/page.tsx',
        'app/layout.tsx',
      ],
      thresholds: {
        lines: 46,
        statements: 45,
        functions: 45,
        branches: 34,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
