import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test files location
    include: ['tests/**/*.test.ts', 'validate/**/__tests__/**/*.test.ts'],

    // Test environment
    environment: 'node',

    // TypeScript configuration
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'vitest.config.ts',
      ],
      // Aim for good coverage on core logic
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Globals (like jest)
    globals: true,

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Timeout settings
    testTimeout: 10000,

    // Mock external modules by default
    mockReset: true,
    clearMocks: true,

    // Test reporters
    reporters: ['default'],

    // Parallel execution
    pool: 'threads',

    // Ensure CI fails when no tests are found
    passWithNoTests: false,
  },

  // Resolve configuration to match your tsconfig
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
