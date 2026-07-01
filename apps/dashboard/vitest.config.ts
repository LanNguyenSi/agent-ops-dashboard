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
      // numbers are identical with/without the flag.) Floor locked just
      // below the measured baseline under this wider scope (lines 38.86 /
      // stmts 38.09 / funcs 40 / branches 27.68) so a new untested file
      // drops the gate. Raise as coverage improves.
      include: ['lib/**', 'components/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.*',
        '**/types.ts',
      ],
      thresholds: {
        lines: 37,
        statements: 37,
        functions: 39,
        branches: 26,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
