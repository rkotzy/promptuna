import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Promptuna } from '../../src/Promptuna';
import { testConfigs } from '../fixtures/test-utils';

// Mock fs/promises for config loading
import { readFile } from 'fs/promises';
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock crypto for deterministic routing
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'abcdef123456'),
  })),
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));

describe('Promptuna Integration Tests', () => {
  let promptuna: Promptuna;
  let mockReadFile: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock fs.readFile to return our test config
    mockReadFile = vi.mocked(readFile);
    mockReadFile.mockResolvedValue(JSON.stringify(testConfigs.valid));

    // Create Promptuna instance
    promptuna = new Promptuna({
      configPath: './test-config.json',
      openaiApiKey: 'test-openai-key',
    });
  });

  describe('configuration loading', () => {
    it('should load configuration from file', async () => {
      await promptuna.getTemplate({
        promptId: 'greeting',
        variantId: 'v_default',
        variables: {},
      });

      expect(mockReadFile).toHaveBeenCalledWith('./test-config.json', 'utf-8');
    });

    it('should cache configuration after first load', async () => {
      await promptuna.getTemplate({
        promptId: 'greeting',
        variantId: 'v_default',
        variables: {},
      });

      await promptuna.getTemplate({
        promptId: 'greeting',
        variantId: 'v_default',
        variables: {},
      });

      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should handle configuration loading errors', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Config file not found'));

      await expect(
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: {},
        })
      ).rejects.toThrow('Failed to load config file');
    });
  });

  describe('template processing', () => {
    it('should process templates with variables', async () => {
      const messages = await promptuna.getTemplate({
        promptId: 'greeting',
        variantId: 'v_default',
        variables: {
          name: 'Alice',
        },
      });

      expect(messages).toBeInstanceOf(Array);
      expect(messages).toHaveLength(2); // greeting prompt has 2 messages
      expect(messages[0]).toMatchObject({
        role: 'system',
        content: expect.any(String),
      });
      expect(messages[1]).toMatchObject({
        role: 'user',
        content: expect.any(String),
      });

      // Verify template was processed with variables
      expect(messages[1].content).toContain('Alice');
    });

    it('should handle missing template variables', async () => {
      const messages = await promptuna.getTemplate({
        promptId: 'greeting',
        variantId: 'v_default',
        variables: {
          name: 'Alice',
          // Missing other variables
        },
      });

      expect(messages).toBeInstanceOf(Array);
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toContain('Alice');
    });

    it('should throw error for non-existent prompt', async () => {
      await expect(
        promptuna.getTemplate({
          promptId: 'non_existent_prompt',
          variantId: 'v_default',
          variables: {},
        })
      ).rejects.toThrow('Prompt not found');
    });

    it('should throw error for non-existent variant', async () => {
      await expect(
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'non_existent_variant',
          variables: {},
        })
      ).rejects.toThrow('Variant not found');
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');

      await expect(
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: {},
        })
      ).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const invalidConfig = {
        version: '1.0.0',
        providers: {},
        // Missing prompts
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidConfig));

      await expect(
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: {},
        })
      ).rejects.toThrow();
    });
  });

  describe('multiple operations', () => {
    it('should handle multiple concurrent template requests', async () => {
      const promises = [
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: { name: 'Alice' },
        }),
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: { name: 'Bob' },
        }),
        promptuna.getTemplate({
          promptId: 'greeting',
          variantId: 'v_default',
          variables: { name: 'Charlie' },
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((messages, index) => {
        expect(messages).toBeInstanceOf(Array);
        expect(messages).toHaveLength(2);
        expect(messages[1].content).toContain(
          ['Alice', 'Bob', 'Charlie'][index]
        );
      });

      // Config should still be loaded only once
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });
  });
});
