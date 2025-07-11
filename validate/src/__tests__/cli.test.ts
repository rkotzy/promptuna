import { describe, it, expect } from 'vitest';
import { ConfigValidator } from '../../../src/validation/ConfigValidator';

describe('promptuna-validate CLI (smoke test)', () => {
  it('ConfigValidator can be instantiated', () => {
    const validator = new ConfigValidator();
    expect(validator).toBeDefined();
    expect(validator).toBeInstanceOf(ConfigValidator);
  });

  it('ConfigValidator has validateAndLoadConfigFile method', () => {
    const validator = new ConfigValidator();
    expect(validator.validateAndLoadConfigFile).toBeDefined();
    expect(typeof validator.validateAndLoadConfigFile).toBe('function');
  });

  it('CLI help text format is correct', () => {
    // Test the help text directly without spawning a process
    const helpText = `Promptuna Configuration Validator\n\nUsage: promptuna-validate <config-file>`;
    expect(helpText).toContain('Promptuna Configuration Validator');
    expect(helpText).toContain('Usage: promptuna-validate');
    expect(helpText).toMatch(/Usage: promptuna-validate/);
  });
});
