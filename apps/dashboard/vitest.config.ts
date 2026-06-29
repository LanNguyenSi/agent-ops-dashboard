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
      // Ratchet floor locked just below the 2026-06-29 measured baseline
      // (lines 79.7 / stmts 78.5 / funcs 84 / branches 56.4) so coverage of
      // the tested modules cannot silently erode. Raise as coverage improves.
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 80,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
