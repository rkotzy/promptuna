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

// Mock the compiled validator
vi.mock('../src/validation/compiled-validator.js', () => {
  interface ValidatorError {
    instancePath: string;
    schemaPath: string;
    keyword: string;
    params?: Record<string, any>;
    message: string;
    schema?: any;
    parentSchema?: any;
    data?: any;
  }

  interface ValidatorFunction {
    (data: any, options?: any): boolean;
    errors?: ValidatorError[] | null;
  }

  const validator: ValidatorFunction = function validate(data: any): boolean {
    // Basic validation logic for tests
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.providers || !data.prompts) {
      validator.errors = [
        {
          instancePath: '/',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'version/providers/prompts' },
          message: 'must have required properties',
        },
      ];
      return false;
    }
    validator.errors = null;
    return true;
  };
  validator.errors = null;
  return { default: validator };
});

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
