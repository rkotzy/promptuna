import { vi, expect } from 'vitest';
import type { PromptunaConfig } from '../../src/config/types';

/**
 * Creates a mock file system readFile function
 */
export function createMockReadFile(configs: Record<string, any>) {
  return vi.fn().mockImplementation((path: string) => {
    const configName = path.split('/').pop()?.replace('.json', '');
    if (configName && configs[configName]) {
      return Promise.resolve(JSON.stringify(configs[configName]));
    }
    return Promise.reject(new Error(`File not found: ${path}`));
  });
}

/**
 * Creates a mock crypto hash function for deterministic testing
 */
export function createMockHash(hexValue: string = 'deadbeef') {
  return vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => hexValue),
  }));
}

/**
 * Test configuration fixtures
 */
export const testConfigs = {
  valid: {
    version: '1.0.0',
    providers: {
      openai_gpt4: {
        type: 'openai',
        baseUrl: 'https://api.openai.com/v1'
      },
      anthropic_claude: {
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com'
      },
      google_gemini: {
        type: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com'
      }
    },
    responseSchemas: {
      user_profile: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'age', 'email'],
        additionalProperties: false
      }
    },
    prompts: {
      greeting: {
        description: 'A simple greeting prompt',
        variants: {
          v_default: {
            default: true,
            provider: 'openai_gpt4',
            model: 'gpt-4',
            messages: [
              { role: 'system', content: { template: 'You are a helpful assistant.' } },
              { role: 'user', content: { template: 'Hello {{name}}! How are you today?' } }
            ],
            parameters: { temperature: 0.7, max_tokens: 100 }
          }
        },
        routing: {
          rules: [{ weight: 100, target: 'v_default' }]
        }
      }
    }
  } as PromptunaConfig,

  invalid: {
    version: '1.0.0',
    providers: {
      openai_gpt4: { type: 'openai' }
    },
    prompts: {
      invalid_prompt: {
        description: 'An invalid prompt for testing - no default variant',
        variants: {
          v_one: {
            provider: 'openai_gpt4',
            model: 'gpt-4',
            messages: [{ role: 'user', content: { template: 'Test' } }],
            parameters: { temperature: 0.7, max_tokens: 100 }
          },
          v_two: {
            provider: 'openai_gpt4',
            model: 'gpt-4',
            messages: [{ role: 'user', content: { template: 'Test' } }],
            parameters: { temperature: 0.7, max_tokens: 100 }
          }
        },
        routing: {
          rules: [
            { weight: 50, target: 'v_nonexistent' },
            { weight: 50, target: 'v_one' }
          ]
        }
      }
    }
  } as PromptunaConfig,
  
  // Minimal valid config for quick tests
  minimal: {
    version: '1.0.0',
    providers: {
      test_provider: {
        type: 'openai',
      },
    },
    prompts: {
      test_prompt: {
        description: 'A minimal test prompt',
        variants: {
          v_default: {
            default: true,
            provider: 'test_provider',
            model: 'gpt-4',
            messages: [
              {
                role: 'user',
                content: { template: 'Test {{name}}' },
              },
            ],
            parameters: {
              temperature: 0.7,
              max_tokens: 100,
            },
          },
        },
        routing: {
          rules: [
            {
              weight: 100,
              target: 'v_default',
            },
          ],
        },
      },
    },
  } as PromptunaConfig,
  
  // Config with complex routing
  complexRouting: {
    version: '1.0.0',
    providers: {
      provider_a: { type: 'openai' },
      provider_b: { type: 'anthropic' },
      provider_c: { type: 'google' },
    },
    prompts: {
      complex_prompt: {
        description: 'A complex prompt with multiple routing options',
        variants: {
          v_default: {
            default: true,
            provider: 'provider_a',
            model: 'gpt-4',
            messages: [{ role: 'user', content: { template: 'Default' } }],
            parameters: { temperature: 0.7, max_tokens: 100 },
          },
          v_premium: {
            provider: 'provider_b',
            model: 'claude-3-sonnet-20240229',
            messages: [{ role: 'user', content: { template: 'Premium' } }],
            parameters: { temperature: 0.5, max_tokens: 150 },
          },
          v_experimental: {
            provider: 'provider_c',
            model: 'gemini-1.5-flash',
            messages: [{ role: 'user', content: { template: 'Experimental' } }],
            parameters: { temperature: 0.9, max_tokens: 80 },
          },
        },
        routing: {
          rules: [
            {
              tags: ['premium', 'vip'],
              weight: 100,
              target: 'v_premium',
            },
            {
              tags: ['beta', 'experimental'],
              weight: 100,
              target: 'v_experimental',
            },
            {
              weight: 70,
              target: 'v_default',
            },
            {
              weight: 30,
              target: 'v_experimental',
            },
          ],
          phased: [
            {
              start: 1704067200, // 2024-01-01
              end: 1706745600,   // 2024-02-01
              weights: {
                v_default: 50,
                v_premium: 30,
                v_experimental: 20,
              },
            },
          ],
        },
      },
    },
  } as PromptunaConfig,
};

/**
 * Test user contexts for routing tests
 */
export const testUsers = {
  basic: {
    userId: 'user_123',
    tags: [],
  },
  premium: {
    userId: 'user_456',
    tags: ['premium', 'vip'],
  },
  beta: {
    userId: 'user_789',
    tags: ['beta', 'experimental'],
  },
  mixed: {
    userId: 'user_abc',
    tags: ['premium', 'beta', 'US'],
  },
};

/**
 * Mock provider responses for testing
 */
export const mockProviderFactory = {
  openai: () => ({
    chatCompletion: vi.fn().mockResolvedValue({
      id: 'test_openai_123',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'OpenAI response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    }),
  }),
  
  anthropic: () => ({
    chatCompletion: vi.fn().mockResolvedValue({
      id: 'test_anthropic_123',
      model: 'claude-3-sonnet-20240229',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Anthropic response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
      },
    }),
  }),
  
  google: () => ({
    chatCompletion: vi.fn().mockResolvedValue({
      id: 'test_google_123',
      model: 'gemini-1.5-flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Google response',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 6,
        total_tokens: 14,
      },
    }),
  }),
};

/**
 * Time utilities for testing phased rollouts
 */
export const testTimes = {
  // 2024-01-01 (within phase)
  withinPhase: 1704067200,
  
  // 2024-02-15 (after phase)
  afterPhase: 1708000000,
  
  // 2023-12-01 (before phase)
  beforePhase: 1701388800,
};

/**
 * Creates a mock Date.now function for time-based testing
 */
export function mockCurrentTime(timestamp: number) {
  return vi.fn(() => timestamp);
}

/**
 * Assertion helpers for test readability
 */
export const testAssertions = {
  expectVariantSelected: (result: any, expectedVariant: string) => {
    expect(result).toMatchObject({
      variantId: expectedVariant,
      variant: expect.any(Object),
      reason: expect.any(String),
    });
  },
  
  expectRoutingReason: (result: any, expectedReason: string) => {
    expect(result.reason).toBe(expectedReason);
  },
  
  expectProviderCalled: (mockProvider: any, expectedParams: any) => {
    expect(mockProvider.chatCompletion).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    );
  },
};