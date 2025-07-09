import { describe, it, expect } from 'vitest';
import { buildProviderParams } from '../../../src/shared/utils/normalizeParameters';

describe('buildProviderParams', () => {
  describe('OpenAI provider', () => {
    it('should map canonical parameters to OpenAI format', () => {
      const canonical = {
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      };

      const result = buildProviderParams('openai', canonical);

      expect(result).toEqual({
        temperature: 1.4, // 0.7 * 2 due to scaling
        max_completion_tokens: 100,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      });
    });

    it('should apply scaling and constraints for temperature', () => {
      const canonical = {
        temperature: 0.5, // Should be scaled to 1.0 for OpenAI (0.5 * 2)
      };

      const result = buildProviderParams('openai', canonical);

      expect(result).toEqual({
        temperature: 1.0,
      });
    });

    it('should apply max constraints', () => {
      const canonical = {
        temperature: 2.5, // Should be scaled to 5.0, then clamped to max 2.0
      };

      const result = buildProviderParams('openai', canonical);

      expect(result).toEqual({
        temperature: 2.0,
      });
    });

    it('should ignore unknown parameters', () => {
      const canonical = {
        temperature: 0.7,
        unknown_param: 'value',
      };

      const result = buildProviderParams('openai', canonical);

      expect(result).toEqual({
        temperature: 1.4, // 0.7 * 2 due to scaling
      });
    });
  });

  describe('Anthropic provider', () => {
    it('should map canonical parameters to Anthropic format', () => {
      const canonical = {
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
      };

      const result = buildProviderParams('anthropic', canonical);

      expect(result).toEqual({
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
      });
    });

    it('should apply max constraints for temperature', () => {
      const canonical = {
        temperature: 1.5, // Should be clamped to max 1.0 for Anthropic
      };

      const result = buildProviderParams('anthropic', canonical);

      expect(result).toEqual({
        temperature: 1.0,
      });
    });

    it('should exclude unsupported parameters', () => {
      const canonical = {
        temperature: 0.7,
        max_tokens: 100,
        frequency_penalty: 0.1, // Not supported by Anthropic
        presence_penalty: 0.2, // Not supported by Anthropic
      };

      const result = buildProviderParams('anthropic', canonical);

      expect(result).toEqual({
        temperature: 0.7,
        max_tokens: 100,
      });
    });
  });

  describe('Google provider', () => {
    it('should map canonical parameters to Google format', () => {
      const canonical = {
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      };

      const result = buildProviderParams('google', canonical);

      expect(result).toEqual({
        temperature: 1.4, // 0.7 * 2 due to scaling
        maxOutputTokens: 100,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
      });
    });

    it('should apply scaling and constraints for temperature', () => {
      const canonical = {
        temperature: 0.5, // Should be scaled to 1.0 for Google (0.5 * 2)
      };

      const result = buildProviderParams('google', canonical);

      expect(result).toEqual({
        temperature: 1.0,
      });
    });

    it('should apply max constraints', () => {
      const canonical = {
        temperature: 2.5, // Should be scaled to 5.0, then clamped to max 2.0
      };

      const result = buildProviderParams('google', canonical);

      expect(result).toEqual({
        temperature: 2.0,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty parameters object', () => {
      const result = buildProviderParams('openai', {});

      expect(result).toEqual({});
    });

    it('should handle undefined parameters', () => {
      const result = buildProviderParams('openai', undefined);

      expect(result).toEqual({});
    });

    it('should handle unknown provider types gracefully', () => {
      const canonical = {
        temperature: 0.7,
        max_tokens: 100,
      };

      const result = buildProviderParams('unknown_provider' as any, canonical);

      expect(result).toEqual({});
    });
  });

  describe('parameter-specific mappings', () => {
    it('should handle different parameter names across providers', () => {
      const canonical = {
        max_tokens: 100,
        top_p: 0.9,
      };

      const openaiResult = buildProviderParams('openai', canonical);
      const anthropicResult = buildProviderParams('anthropic', canonical);
      const googleResult = buildProviderParams('google', canonical);

      expect(openaiResult).toEqual({
        max_completion_tokens: 100,
        top_p: 0.9,
      });

      expect(anthropicResult).toEqual({
        max_tokens: 100,
        top_p: 0.9,
      });

      expect(googleResult).toEqual({
        maxOutputTokens: 100,
        topP: 0.9,
      });
    });

    it('should handle parameters supported by some providers but not others', () => {
      const canonical = {
        temperature: 0.7,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      };

      const openaiResult = buildProviderParams('openai', canonical);
      const anthropicResult = buildProviderParams('anthropic', canonical);
      const googleResult = buildProviderParams('google', canonical);

      expect(openaiResult).toEqual({
        temperature: 1.4, // 0.7 * 2 due to scaling
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      });

      expect(anthropicResult).toEqual({
        temperature: 0.7,
        // frequency_penalty and presence_penalty not supported by Anthropic
      });

      expect(googleResult).toEqual({
        temperature: 1.4, // 0.7 * 2 due to scaling
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
      });
    });
  });

  describe('scaling functions', () => {
    it('should apply scaling functions when defined', () => {
      const canonical = {
        temperature: 0.5,
      };

      // OpenAI scales temperature by 2x
      const openaiResult = buildProviderParams('openai', canonical);
      expect(openaiResult.temperature).toBe(1.0);

      // Anthropic doesn't scale temperature
      const anthropicResult = buildProviderParams('anthropic', canonical);
      expect(anthropicResult.temperature).toBe(0.5);

      // Google scales temperature by 2x
      const googleResult = buildProviderParams('google', canonical);
      expect(googleResult.temperature).toBe(1.0);
    });
  });

  describe('constraints application', () => {
    it('should apply min constraints correctly', () => {
      const canonical = {
        temperature: -1.0,
      };

      const result = buildProviderParams('openai', canonical);

      expect(result.temperature).toBe(0); // Min constraint applied after scaling
    });

    it('should apply max constraints correctly', () => {
      const canonical = {
        temperature: 2.0, // Will be scaled to 4.0, then clamped to 2.0
      };

      const result = buildProviderParams('openai', canonical);

      expect(result.temperature).toBe(2.0); // Max constraint applied
    });
  });
});
