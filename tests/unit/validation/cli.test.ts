import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('CLI Validation Tool (Smoke Test)', () => {
  it('should have a CLI file that exists', () => {
    const cliPath = resolve('./dist/validation/cli.js');
    expect(existsSync(cliPath)).toBe(true);
  });

  it('should import validation functions without errors', async () => {
    // This tests that the validation module can be imported
    const { loadAndValidateConfig } = await import(
      '../../../src/validation/index.js'
    );

    expect(typeof loadAndValidateConfig).toBe('function');
  });
});
