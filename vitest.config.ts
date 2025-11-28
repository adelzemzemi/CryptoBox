import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@crypto': path.resolve(__dirname, './src/crypto'),
      '@security': path.resolve(__dirname, './src/security'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@storage': path.resolve(__dirname, './src/storage'),
      '@secure-storage': path.resolve(__dirname, './src/secure-storage'),
      '@factories': path.resolve(__dirname, './src/factories'),
      '@fingerprint': path.resolve(__dirname, './src/fingerprint'),
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
      exclude: [
        'node_modules/',
        'dist/',
        'examples/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
