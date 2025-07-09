import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateContentSpy = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: generateContentSpy,
      },
    })),
  };
});

import { GoogleProvider } from '../../../src/providers/google';

describe('GoogleProvider', () => {
  let provider: GoogleProvider;

  beforeEach(() => {
    generateContentSpy.mockReset();
    provider = new GoogleProvider('test-api-key');
    (provider as any).ai = {
      models: {
        generateContent: generateContentSpy,
      },
    };
  });

  it('should map messages and normalise response', async () => {
    generateContentSpy.mockResolvedValueOnce({
      id: 'google1',
      text: 'Hi from Google',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const res = await provider.chatCompletion({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ],
    } as any);

    expect(generateContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-1.5-flash' })
    );

    expect(res).toEqual({
      id: 'google1',
      model: 'gemini-1.5-flash',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi from Google' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });

  it('should supply responseSchema when structured output requested', async () => {
    generateContentSpy.mockResolvedValueOnce({ id: 'google2', text: '{}' });

    await provider.chatCompletion({
      model: 'gemini',
      messages: [{ role: 'user', content: 'hello' }],
      responseFormat: { type: 'json_schema' },
      responseSchema: { type: 'object' },
    } as any);

    expect(generateContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ responseSchema: expect.any(Object) }),
      })
    );
  });

  it('should normalise timeout error', async () => {
    generateContentSpy.mockRejectedValueOnce({
      message: 'Gateway timeout',
      status: 504,
    });

    await expect(
      provider.chatCompletion({
        model: 'gemini',
        messages: [{ role: 'user', content: 'hi' }],
      } as any)
    ).rejects.toMatchObject({ reason: 'timeout', retryable: true });
  });
});
