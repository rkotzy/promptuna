import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy for messages.create
const createMsgSpy = vi.fn();

// Mock @anthropic-ai/sdk before importing provider
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: createMsgSpy,
      },
    })),
  };
});

import { AnthropicProvider } from '../../../src/providers/anthropic';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    createMsgSpy.mockReset();
    provider = new AnthropicProvider('test-api-key');
    (provider as any).client = {
      messages: {
        create: createMsgSpy,
      },
    };
  });

  it('should map request and normalise response text', async () => {
    createMsgSpy.mockResolvedValueOnce({
      id: 'msg123',
      content: [{ type: 'text', text: 'Hi there' }],
      usage: { input_tokens: 2, output_tokens: 3 },
      stop_reason: 'end_turn',
    });

    const res = await provider.chatCompletion({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: 'Hi' }],
    } as any);

    expect(createMsgSpy).toHaveBeenCalled();
    expect(res).toEqual({
      id: 'msg123',
      model: 'claude-3-sonnet-20240229',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi there' },
          finish_reason: 'end_turn',
        },
      ],
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
    });
  });

  it('should include tool specification for structured response format', async () => {
    createMsgSpy.mockResolvedValueOnce({
      id: 'msg_struct',
      content: [{ type: 'tool_use', input: { foo: 'bar' } }],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'tool_use',
    });

    await provider.chatCompletion({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: 'hello' }],
      responseFormat: { type: 'json_schema' },
      responseSchema: { type: 'object' },
    } as any);

    expect(createMsgSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.any(Array),
        tool_choice: expect.any(Object),
      })
    );
  });

  it('should normalise rate-limit errors', async () => {
    createMsgSpy.mockRejectedValueOnce({ message: 'Rate', status: 429 });

    await expect(
      provider.chatCompletion({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({ reason: 'rate-limit', retryable: true });
  });
});
