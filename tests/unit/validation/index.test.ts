import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateConfig,
  loadAndValidateConfig,
} from '../../../src/validation/index';
import { ConfigurationError } from '../../../src/config/types';
import { testConfigs } from '../../fixtures/test-utils';
import { readFile } from 'fs/promises';

vi.mock('fs/promises');

describe('Validation Module', () => {
  let mockReadFile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile = vi.mocked(readFile);
  });

  describe('validateConfig', () => {
    it('should validate a valid configuration', () => {
      const result = validateConfig(testConfigs.valid);
      expect(result).toEqual(testConfigs.valid);
    });

    it('should throw for invalid configuration', () => {
      const invalidConfig = {
        version: '1.0.0',
        // Missing required fields
      };

      expect(() => validateConfig(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw for missing default variant', () => {
      const configWithoutDefault = {
        ...testConfigs.valid,
        prompts: {
          greeting: {
            ...testConfigs.valid.prompts.greeting,
            variants: {
              v_test: {
                ...testConfigs.valid.prompts.greeting.variants.v_default,
                default: false,
              },
            },
          },
        },
      };

      expect(() => validateConfig(configWithoutDefault)).toThrow(
        'must have exactly one variant with default: true'
      );
    });

    it('should throw for invalid version format', () => {
      const configWithBadVersion = {
        ...testConfigs.valid,
        version: 'invalid',
      };

      expect(() => validateConfig(configWithBadVersion)).toThrow(
        'Invalid version format'
      );
    });
  });

  describe('loadAndValidateConfig', () => {
    it('should load and validate configuration from file', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(testConfigs.valid));

      const result = await loadAndValidateConfig('./test-config.json');

      expect(mockReadFile).toHaveBeenCalledWith('./test-config.json', 'utf-8');
      expect(result).toEqual(testConfigs.valid);
    });

    it('should throw for file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(loadAndValidateConfig('./missing.json')).rejects.toThrow(
        'Failed to load config file'
      );
    });

    it('should throw for JSON parse errors', async () => {
      mockReadFile.mockResolvedValue('invalid json {');

      await expect(loadAndValidateConfig('./invalid.json')).rejects.toThrow(
        'Failed to load config file'
      );
    });

    it('should throw for validation errors', async () => {
      const invalidConfig = {
        version: '1.0.0',
        // Missing required fields
      };
      mockReadFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(
        loadAndValidateConfig('./invalid-config.json')
      ).rejects.toThrow(ConfigurationError);
    });
  });
});
