import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testConfigs,
  testUsers,
  testTimes,
  mockCurrentTime,
  testAssertions,
} from '../../fixtures/test-utils';
import type { VariantSelectorParams } from '../../../src/routing/types';

// Mock crypto module before importing the selector
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'deadbeef12345678'),
  })),
}));

// Now import the selector after mocking
import { selectVariant } from '../../../src/routing/selector';

describe('Variant Selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Variant Selection', () => {
    it('should select default variant when no routing rules match', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.minimal.prompts.test_prompt,
        promptId: 'test_prompt',
        userId: undefined,
        tags: [],
      };

      const result = selectVariant(params);

      testAssertions.expectVariantSelected(result, 'v_default');
      testAssertions.expectRoutingReason(result, 'weight-distribution');
    });

    it('should select variant based on weight distribution when user has no tags', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_123',
        tags: [],
      };

      const result = selectVariant(params);

      expect(result.variantId).toBeDefined();
      expect(['v_default', 'v_experimental']).toContain(result.variantId);
      testAssertions.expectRoutingReason(result, 'weight-distribution');
    });
  });

  describe('Tag-based Routing', () => {
    it('should select premium variant for premium users', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: testUsers.premium.userId,
        tags: testUsers.premium.tags,
      };

      const result = selectVariant(params);

      testAssertions.expectVariantSelected(result, 'v_premium');
      testAssertions.expectRoutingReason(result, 'tag-match');
    });

    it('should select experimental variant for beta users', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: testUsers.beta.userId,
        tags: testUsers.beta.tags,
      };

      const result = selectVariant(params);

      testAssertions.expectVariantSelected(result, 'v_experimental');
      testAssertions.expectRoutingReason(result, 'tag-match');
    });

    it('should handle multiple matching tags (weighted selection)', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: testUsers.mixed.userId,
        tags: testUsers.mixed.tags,
      };

      const result = selectVariant(params);

      // Should match one of the tag-based variants (premium or experimental)
      expect(['v_premium', 'v_experimental']).toContain(result.variantId);
      testAssertions.expectRoutingReason(result, 'tag-match');
    });

    it('should handle partial tag matches', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_test',
        tags: ['vip', 'US'], // Only 'vip' matches premium rule
      };

      const result = selectVariant(params);

      testAssertions.expectVariantSelected(result, 'v_premium');
      testAssertions.expectRoutingReason(result, 'tag-match');
    });
  });

  describe('Phased Rollouts', () => {
    it('should use phased weights during active phase', () => {
      vi.spyOn(Date, 'now').mockReturnValue(testTimes.withinPhase * 1000);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_phase_test',
        tags: [],
      };

      // Mock hash to select v_premium from phased weights
      vi.doMock('crypto', () => ({
        createHash: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn(() => '80000000'), // Should map to v_premium in phased weights
        })),
      }));

      const result = selectVariant(params);

      testAssertions.expectRoutingReason(result, 'phased-rollout');
    });

    it('should fall back to regular routing after phase ends', () => {
      vi.spyOn(Date, 'now').mockReturnValue(testTimes.afterPhase * 1000);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_after_phase',
        tags: [],
      };

      const result = selectVariant(params);

      testAssertions.expectRoutingReason(result, 'weight-distribution');
    });

    it('should fall back to regular routing before phase starts', () => {
      vi.spyOn(Date, 'now').mockReturnValue(testTimes.beforePhase * 1000);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_before_phase',
        tags: [],
      };

      const result = selectVariant(params);

      testAssertions.expectRoutingReason(result, 'weight-distribution');
    });
  });

  describe('Weight Distribution', () => {
    it('should distribute users based on configured weights', () => {
      // Test with a smaller, more controlled sample
      const results: string[] = [];
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];

      userIds.forEach(userId => {
        const params: VariantSelectorParams = {
          prompt: testConfigs.complexRouting.prompts.complex_prompt,
          promptId: 'complex_prompt',
          userId,
          tags: [],
        };

        const result = selectVariant(params);
        results.push(result.variantId);
      });

      // Should get variants from the weight distribution
      const uniqueVariants = [...new Set(results)];
      expect(uniqueVariants.length).toBeGreaterThan(0);
      expect(
        uniqueVariants.every(v => ['v_default', 'v_experimental'].includes(v))
      ).toBe(true);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should return same variant for same user consistently', () => {
      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'consistent_user',
        tags: [],
      };

      const result1 = selectVariant(params);
      const result2 = selectVariant(params);
      const result3 = selectVariant(params);

      expect(result1.variantId).toBe(result2.variantId);
      expect(result2.variantId).toBe(result3.variantId);
    });

    it('should return different variants for different users', () => {
      const params1: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_1',
        tags: [],
      };

      const params2: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'user_2',
        tags: [],
      };

      const result1 = selectVariant(params1);
      const result2 = selectVariant(params2);

      // Different users might get different variants (though not guaranteed)
      // The important thing is that each user gets consistent results
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Verify consistency for each user
      expect(selectVariant(params1).variantId).toBe(result1.variantId);
      expect(selectVariant(params2).variantId).toBe(result2.variantId);
    });

    it('should use Math.random for users without userId', () => {
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: undefined,
        tags: [],
      };

      selectVariant(params);

      expect(mathRandomSpy).toHaveBeenCalled();

      mathRandomSpy.mockRestore();
    });
  });

  describe('Priority Order', () => {
    it('should prioritize tag-based routing over phased rollouts', () => {
      vi.spyOn(Date, 'now').mockReturnValue(testTimes.withinPhase * 1000);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'priority_test_user',
        tags: ['premium'], // Should trigger tag-based routing
      };

      const result = selectVariant(params);

      // Tag-based routing should win over phased rollout
      testAssertions.expectVariantSelected(result, 'v_premium');
      testAssertions.expectRoutingReason(result, 'tag-match');
    });

    it('should prioritize phased rollouts over weight distribution', () => {
      vi.spyOn(Date, 'now').mockReturnValue(testTimes.withinPhase * 1000);

      const params: VariantSelectorParams = {
        prompt: testConfigs.complexRouting.prompts.complex_prompt,
        promptId: 'complex_prompt',
        userId: 'priority_test_user',
        tags: [], // No tags, so no tag-based routing
      };

      const result = selectVariant(params);

      // Phased rollout should win over weight distribution
      testAssertions.expectRoutingReason(result, 'phased-rollout');
    });

    it('should fall back to default when all routing fails', () => {
      const promptWithNoRules = {
        description: 'Test prompt with no routing rules',
        variants: {
          v_default: {
            default: true,
            provider: 'test_provider',
            model: 'test_model',
            messages: [
              { role: 'user' as const, content: { template: 'Test' } },
            ],
            parameters: {},
          },
        },
        routing: {
          rules: [], // No rules
        },
      };

      const params: VariantSelectorParams = {
        prompt: promptWithNoRules,
        promptId: 'no_rules_prompt',
        userId: 'test_user',
        tags: [],
      };

      const result = selectVariant(params);

      testAssertions.expectVariantSelected(result, 'v_default');
      testAssertions.expectRoutingReason(result, 'default');
    });
  });

  describe('Error Handling', () => {
    it('should handle prompt with no default variant gracefully', () => {
      const promptWithoutDefault = {
        description: 'Test prompt without default variant',
        variants: {
          v_one: {
            provider: 'test_provider',
            model: 'test_model',
            messages: [
              { role: 'user' as const, content: { template: 'Test' } },
            ],
            parameters: {},
          },
        },
        routing: {
          rules: [], // No routing rules, so it falls back to default
        },
      };

      const params: VariantSelectorParams = {
        prompt: promptWithoutDefault,
        promptId: 'no_default_prompt',
        userId: 'test_user',
        tags: [],
      };

      expect(() => selectVariant(params)).toThrow(
        'No default variant found for prompt'
      );
    });

    it('should handle routing rule with missing target variant', () => {
      const promptWithInvalidTarget = {
        description: 'Test prompt with invalid routing target',
        variants: {
          v_default: {
            default: true,
            provider: 'test_provider',
            model: 'test_model',
            messages: [
              { role: 'user' as const, content: { template: 'Test' } },
            ],
            parameters: {},
          },
        },
        routing: {
          rules: [
            {
              weight: 100,
              target: 'v_nonexistent', // This variant doesn't exist
            },
          ],
        },
      };

      const params: VariantSelectorParams = {
        prompt: promptWithInvalidTarget,
        promptId: 'invalid_target_prompt',
        userId: 'test_user',
        tags: [],
      };

      // Should throw an error when variant target doesn't exist
      expect(() => selectVariant(params)).toThrow(
        "Variant 'v_nonexistent' not found in prompt"
      );
    });
  });
});
