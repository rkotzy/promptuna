import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigLoader } from '../../../src/config/loader';
import { ConfigurationError } from '../../../src/config/types';
import { testConfigs } from '../../fixtures/test-utils';

// Import and mock fs/promises
import { readFile } from 'fs/promises';
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock version module
vi.mock('../../../src/version', () => ({
  SUPPORTED_SCHEMA_VERSIONS: ['1.0.0'],
  isSchemaVersionSupported: vi.fn((version: string) => version === '1.0.0'),
}));

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let mockReadFile: any;

  beforeEach(() => {
    loader = new ConfigLoader();
    mockReadFile = vi.mocked(readFile);
    vi.clearAllMocks();
  });

  describe('loadConfigFile', () => {
    it('should load and return a valid configuration', async () => {
      const configPath = '/test/config.json';
      mockReadFile.mockResolvedValue(JSON.stringify(testConfigs.valid));

      const result = await loader.loadConfigFile(configPath);

      expect(result).toEqual(testConfigs.valid);
      expect(mockReadFile).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    it('should handle file reading errors', async () => {
      const configPath = '/nonexistent/config.json';
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should handle invalid JSON', async () => {
      const configPath = '/test/invalid.json';
      mockReadFile.mockResolvedValue('{ invalid json }');

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should validate schema version', async () => {
      const configPath = '/test/config.json';
      const invalidVersionConfig = {
        ...testConfigs.valid,
        version: '2.0.0', // Unsupported version
      };
      mockReadFile.mockResolvedValue(JSON.stringify(invalidVersionConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should validate default variants exist', async () => {
      const configPath = '/test/config.json';
      const noDefaultConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_one: {
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
              v_two: {
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_one' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(noDefaultConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'must have exactly one variant with default: true'
      );
    });

    it('should validate against multiple default variants', async () => {
      const configPath = '/test/config.json';
      const multipleDefaultsConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_one: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
              v_two: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_one' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(multipleDefaultsConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'has multiple default variants'
      );
    });

    it('should validate required parameters for Anthropic', async () => {
      const configPath = '/test/config.json';
      const missingMaxTokensConfig = {
        version: '1.0.0',
        providers: {
          claude: { type: 'anthropic' as const },
        },
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'claude',
                model: 'claude-3-sonnet-20240229',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 }, // Missing max_tokens
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(missingMaxTokensConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'missing required parameter(s) for provider "anthropic": max_tokens'
      );
    });

    it('should not require max_tokens for OpenAI', async () => {
      const configPath = '/test/config.json';
      const openaiConfig = {
        version: '1.0.0',
        providers: {
          openai: { type: 'openai' as const },
        },
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 }, // max_tokens not required for OpenAI
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(openaiConfig));

      const result = await loader.loadConfigFile(configPath);
      expect(result).toBeDefined();
      expect(
        result.prompts.test_prompt.variants.v_default.parameters?.max_tokens
      ).toBeUndefined();
    });

    it('should provide helpful error context', async () => {
      const configPath = '/test/config.json';
      mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'));

      try {
        await loader.loadConfigFile(configPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).details).toMatchObject({
          configPath,
          error: 'ENOENT: file not found',
        });
      }
    });

    it('should validate template syntax in messages', async () => {
      const configPath = '/test/config.json';
      const invalidTemplateConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  {
                    role: 'user' as const,
                    content: { template: 'Hello {{name}' }, // Missing closing brace
                  },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(invalidTemplateConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'Template syntax error'
      );
    });

    it('should validate template filter usage', async () => {
      const configPath = '/test/config.json';
      const invalidFilterConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  {
                    role: 'user' as const,
                    content: { template: 'Hello {{name | unknown_filter}}' }, // Invalid filter
                  },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(invalidFilterConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'Template syntax error'
      );
    });

    it('should validate complex template structures', async () => {
      const configPath = '/test/config.json';
      const complexInvalidConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  {
                    role: 'user' as const,
                    content: {
                      template: '{% for item in items %}{{item}}{% endfor',
                    }, // Missing closing %}
                  },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(complexInvalidConfig));

      await expect(loader.loadConfigFile(configPath)).rejects.toThrow(
        'Template syntax error'
      );
    });

    it('should pass validation for valid templates', async () => {
      const configPath = '/test/config.json';
      const validTemplateConfig = {
        ...testConfigs.valid,
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  {
                    role: 'user' as const,
                    content: { template: 'Hello {{name | default: "World"}}!' },
                  },
                  {
                    role: 'assistant' as const,
                    content: {
                      template:
                        '{% if greeting %}{{greeting}}{% else %}Hi there!{% endif %}',
                    },
                  },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(validTemplateConfig));

      const result = await loader.loadConfigFile(configPath);
      expect(result).toEqual(validTemplateConfig);
    });
  });

  describe('error handling', () => {
    it('should preserve ConfigurationError instances', async () => {
      const configPath = '/test/config.json';
      mockReadFile.mockResolvedValue(JSON.stringify(testConfigs.invalid));

      try {
        await loader.loadConfigFile(configPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).code).toBe('CONFIGURATION_ERROR');
      }
    });

    it('should wrap file system errors in ConfigurationError', async () => {
      const configPath = '/test/config.json';
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      try {
        await loader.loadConfigFile(configPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).message).toContain(
          'Failed to load config file'
        );
      }
    });
  });
});
