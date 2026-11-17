import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@core': path.resolve(import.meta.dirname, './src/core'),
      '@crypto': path.resolve(import.meta.dirname, './src/crypto'),
      '@security': path.resolve(import.meta.dirname, './src/security'),
      '@utils': path.resolve(import.meta.dirname, './src/utils'),
      '@storage': path.resolve(import.meta.dirname, './src/storage'),
      '@secure-storage': path.resolve(import.meta.dirname, './src/secure-storage'),
      '@factories': path.resolve(import.meta.dirname, './src/factories'),
      '@fingerprint': path.resolve(import.meta.dirname, './src/fingerprint'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Without `include`, files with no tests are absent from the report entirely.
      include: ['src/**/*.ts'],
      // Pure re-export barrels and type-only files have no runtime code to cover.
      exclude: [
        'src/index.ts',
        'src/fingerprint/index.ts',
        'src/core/interfaces/**',
        'src/core/options.ts',
        'src/core/types.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
        statements: 100,
      },
    },
  },
});
