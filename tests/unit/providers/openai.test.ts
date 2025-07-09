import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy that will be attached to the mocked OpenAI SDK
const createChatSpy = vi.fn();

// Mock the optional "openai" dependency that OpenAIProvider loads via dynamic import
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: createChatSpy,
        },
      },
    })),
  };
});

// Import _after_ the mock so that OpenAIProvider picks up the mocked SDK
import { OpenAIProvider } from '../../../src/providers/openai';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    // Reset the spy without removing the constructor mock implementation
    createChatSpy.mockReset();
    provider = new OpenAIProvider('test-api-key');
    // Bypass initializeClient by directly stubbing the internal client
    (provider as any).client = {
      chat: {
        completions: {
          create: createChatSpy,
        },
      },
    };
  });

  it('should map request and normalise the response', async () => {
    createChatSpy.mockResolvedValueOnce({
      id: 'resp123',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    const res = await provider.chatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    } as any);

    expect(createChatSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4', messages: expect.any(Array) })
    );

    expect(res).toEqual({
      id: 'resp123',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });
  });

  it('should include structured response format when responseFormat.type === "json_schema"', async () => {
    createChatSpy.mockResolvedValueOnce({
      id: 'resp_struct',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '{}' },
          finish_reason: 'stop',
        },
      ],
    });

    await provider.chatCompletion({
      model: 'gpt-4',
      messages: [],
      responseFormat: { type: 'json_schema' },
      responseSchema: {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
    } as any);

    expect(createChatSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: {
          type: 'json_schema',
          json_schema: expect.any(Object),
        },
      })
    );
  });

  it('should normalise rate-limit errors into ProviderError with reason "rate-limit"', async () => {
    createChatSpy.mockRejectedValueOnce({ message: 'Rate limit', status: 429 });

    await expect(
      provider.chatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({
      reason: 'rate-limit',
      retryable: true,
    });
  });

  it('should normalise timeout errors into ProviderError with reason "timeout"', async () => {
    createChatSpy.mockRejectedValueOnce({ message: 'Timeout', status: 504 });

    await expect(
      provider.chatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({
      reason: 'timeout',
      retryable: true,
    });
  });

  it('should normalise authentication errors into ProviderError with reason "provider-error"', async () => {
    createChatSpy.mockRejectedValueOnce({
      message: 'Invalid API key',
      status: 401,
    });

    await expect(
      provider.chatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({
      reason: 'provider-error',
      retryable: false,
    });
  });

  it('should normalise server errors into ProviderError with reason "provider-error"', async () => {
    createChatSpy.mockRejectedValueOnce({
      message: 'Internal server error',
      status: 500,
    });

    await expect(
      provider.chatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({
      reason: 'provider-error',
      retryable: false,
    });
  });

  it('should handle network errors gracefully', async () => {
    createChatSpy.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      provider.chatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toThrow('Network error');
  });
});
