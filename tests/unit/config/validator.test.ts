import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigValidator } from '../../../src/validate/ConfigValidator';
import { ConfigurationError } from '../../../src/config/types';
import { testConfigs } from '../../fixtures/test-utils';

// Import and mock fs/promises
import { readFile } from 'fs/promises';
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock path operations
vi.mock('path', () => ({
  resolve: vi.fn((path: string) => '/mocked/schema.json'),
  dirname: vi.fn((path: string) => '/mocked'),
}));

// Mock ES module helpers
vi.mock('url', () => ({
  fileURLToPath: vi.fn((url: string) => '/mocked/file.js'),
}));

describe('ConfigValidator', () => {
  let validator: ConfigValidator;
  let mockReadFile: any;

  beforeEach(() => {
    validator = new ConfigValidator();
    mockReadFile = vi.mocked(readFile);
    vi.clearAllMocks();

    // Default mock for schema.json
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes('schema.json')) {
        return Promise.resolve(
          JSON.stringify({
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              version: { type: 'string' },
              providers: { type: 'object' },
              prompts: { type: 'object' },
            },
            required: ['version', 'providers', 'prompts'],
          })
        );
      }
      return Promise.resolve('{}');
    });
  });

  describe('validate', () => {
    it('should validate a correct configuration', async () => {
      const result = await validator.validate(testConfigs.valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return validation errors for invalid configuration', async () => {
      const invalidConfig = {
        version: '1.0.0',
        // Missing required providers and prompts
      };

      const result = await validator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const incompleteConfig = {
        version: '1.0.0',
        providers: {},
        // Missing prompts
      };

      const result = await validator.validate(incompleteConfig);
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.message.includes('required'))).toBe(
        true
      );
    });
  });

  describe('validateAndLoadConfigFile', () => {
    it('should load and validate a configuration file', async () => {
      const configPath = '/test/config.json';
      const validSchemaJson = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          version: { type: 'string' },
          providers: { type: 'object' },
          prompts: { type: 'object' },
        },
        required: ['version', 'providers', 'prompts'],
      });

      // Mock schema file read
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(validSchemaJson);
        }
        return Promise.resolve(JSON.stringify(testConfigs.valid));
      });

      const result = await validator.validateAndLoadConfigFile(configPath);
      expect(result).toEqual(testConfigs.valid);
    });

    it('should handle file reading errors', async () => {
      const configPath = '/nonexistent/config.json';
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow(ConfigurationError);
    });

    it('should handle JSON parsing errors', async () => {
      const configPath = '/test/invalid.json';
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve('{ invalid json }');
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow(ConfigurationError);
    });

    it('should validate schema references', async () => {
      const configPath = '/test/config.json';
      const configWithInvalidSchemaRef = {
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
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
                responseFormat: {
                  type: 'json_schema' as const,
                  schemaRef: 'nonexistent_schema',
                },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(configWithInvalidSchemaRef));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('Schema reference "nonexistent_schema" not found');
    });

    it('should validate structured output requirements', async () => {
      const configPath = '/test/config.json';
      const invalidStructuredOutputConfig = {
        ...testConfigs.valid,
        responseSchemas: {
          loose_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              optional_field: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: true, // This should be false for structured outputs
          },
        },
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
                responseFormat: {
                  type: 'json_schema' as const,
                  schemaRef: 'loose_schema',
                },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidStructuredOutputConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow(
        'requires additionalProperties: false for structured outputs'
      );
    });

    it('should validate all fields are required for structured outputs', async () => {
      const configPath = '/test/config.json';
      const optionalFieldsConfig = {
        ...testConfigs.valid,
        responseSchemas: {
          optional_fields_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              optional_field: { type: 'string' },
            },
            required: ['name'], // Missing optional_field in required array
            additionalProperties: false,
          },
        },
        prompts: {
          test_prompt: {
            description: 'Test prompt',
            variants: {
              v_default: {
                default: true,
                provider: 'openai_gpt4',
                model: 'gpt-4',
                messages: [
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
                responseFormat: {
                  type: 'json_schema' as const,
                  schemaRef: 'optional_fields_schema',
                },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(optionalFieldsConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow(
        'has optional fields. All fields must be required for structured outputs'
      );
    });

    it('should validate routing configuration', async () => {
      const configPath = '/test/config.json';
      const invalidRoutingConfig = {
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
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [
                { weight: 100, target: 'v_nonexistent' }, // References non-existent variant
              ],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidRoutingConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('targets non-existent variant');
    });

    it('should validate fallback targets', async () => {
      const configPath = '/test/config.json';
      const invalidFallbackConfig = {
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
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
                fallback: [
                  {
                    provider: 'nonexistent_provider', // References non-existent provider
                    model: 'some-model',
                    parameters: { temperature: 0.7 },
                  },
                ],
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidFallbackConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('references non-existent provider');
    });

    it('should validate version compatibility', async () => {
      const configPath = '/test/config.json';
      const unsupportedVersionConfig = {
        ...testConfigs.valid,
        version: '2.0.0', // Unsupported major version
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(unsupportedVersionConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('Unsupported major version');
    });

    it('should validate phased rollout configuration', async () => {
      const configPath = '/test/config.json';
      const invalidPhasedConfig = {
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
                  { role: 'user' as const, content: { template: 'Test' } },
                ],
                parameters: { temperature: 0.7 },
              },
            },
            routing: {
              rules: [{ weight: 100, target: 'v_default' }],
              phased: [
                {
                  start: 1704067200,
                  end: 1706745600,
                  weights: {
                    v_nonexistent: 100, // References non-existent variant
                  },
                },
              ],
            },
          },
        },
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidPhasedConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('has weight for non-existent variant');
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
                    content: { template: 'Hello {{name}' } // Missing closing brace
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

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidTemplateConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('Template syntax error');
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
                    content: { template: 'Hello {{name | nonexistent_filter}}' } // Invalid filter
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

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(invalidFilterConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('Template syntax error');
    });

    it('should validate complex template syntax', async () => {
      const configPath = '/test/config.json';
      const complexInvalidTemplateConfig = {
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
                    content: { template: '{% if condition %}Hello{% endif' } // Missing closing %}
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

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(complexInvalidTemplateConfig));
      });

      await expect(
        validator.validateAndLoadConfigFile(configPath)
      ).rejects.toThrow('Template syntax error');
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
                    content: { template: 'Hello {{name | default: "World"}}!' }
                  },
                  { 
                    role: 'assistant' as const, 
                    content: { template: '{% if greeting %}{{greeting}}{% else %}Hi there!{% endif %}' }
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

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        return Promise.resolve(JSON.stringify(validTemplateConfig));
      });

      const result = await validator.validateAndLoadConfigFile(configPath);
      expect(result).toEqual(validTemplateConfig);
    });
  });

  describe('error handling', () => {
    it('should provide detailed error context', async () => {
      const configPath = '/test/config.json';
      // Mock readFile to fail only for the config file, not the schema file
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('schema.json')) {
          return Promise.resolve(JSON.stringify({ type: 'object' }));
        }
        if (path === configPath) {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve('{}');
      });

      try {
        await validator.validateAndLoadConfigFile(configPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).details).toMatchObject({
          configPath,
          error: 'Permission denied',
        });
      }
    });

    it('should handle schema loading errors', async () => {
      mockReadFile.mockRejectedValue(new Error('Schema file not found'));

      try {
        await validator.validate(testConfigs.valid);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).message).toContain(
          'Failed to load schema'
        );
      }
    });
  });
});
