import { vi, beforeEach, afterEach } from 'vitest';

// Mock console to avoid noise in tests unless explicitly needed
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock crypto module for deterministic tests
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'deadbeef12345678'), // Fixed hash for deterministic tests
  })),
}));

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn((path: string) => path),
  };
});

// Set up global test environment
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset console mocks
  vi.mocked(console.log).mockClear();
  vi.mocked(console.info).mockClear();
  vi.mocked(console.warn).mockClear();
  vi.mocked(console.error).mockClear();
});

// Clean up after tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Extend global types for better TypeScript support
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toMatchObject(expected: any): void;
      toHaveBeenCalledWith(...args: any[]): void;
      toHaveBeenCalledTimes(times: number): void;
    }
  }
}
