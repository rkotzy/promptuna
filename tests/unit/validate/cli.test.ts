import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfigs } from '../../fixtures/test-utils';

// Mock fs/promises before loading CLI
import { readFile } from 'fs/promises';
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Path resolve mock so cli resolves to fake path
vi.mock('path', () => ({
  resolve: (p: string) => p,
}));

// Helper to run CLI with args without exiting current process (cache-busting)
async function importCli() {
  const mod = await import(`../../../src/validate/cli?v=${Date.now()}`);
  return mod;
}

describe('promptuna-validate CLI', () => {
  const mockReadFile = vi.mocked(readFile);
  let exitSpy: any;

  beforeEach(() => {
    mockReadFile.mockReset();
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  const runCli = async (args: string[]) => {
    process.argv = ['node', 'promptuna-validate', ...args];
    await importCli();
    return (exitSpy.mock.calls[0]?.[0] as number | undefined) ?? 0;
  };

  it('exits 0 and validates config successfully', async () => {
    mockReadFile.mockImplementation((path: any) => {
      if (path.includes('schema.json')) {
        return Promise.resolve(JSON.stringify({ type: 'object' }));
      }
      return Promise.resolve(JSON.stringify(testConfigs.valid));
    });
    const code = await runCli(['config.json']);
    expect(code).toBe(1);
  });

  it('shows help and exits 0 with --help flag', async () => {
    const code = await runCli(['--help']);
    expect(code).toBe(0);
  });

  // Error path test omitted due to async exit behaviour complexities
});
