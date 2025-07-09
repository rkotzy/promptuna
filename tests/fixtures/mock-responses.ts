import type { ChatCompletionResponse } from '../../src/providers/types';

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1677652288,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 25,
    completion_tokens: 10,
    total_tokens: 35,
  },
};

export const mockAnthropicResponse = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Hello! How can I help you today?',
    },
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 25,
    output_tokens: 10,
  },
};

export const mockGoogleResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'Hello! How can I help you today?',
          },
        ],
      },
      finishReason: 'STOP',
      index: 0,
    },
  ],
  usageMetadata: {
    promptTokenCount: 25,
    candidatesTokenCount: 10,
    totalTokenCount: 35,
  },
};

export const mockPromptunaResponse: ChatCompletionResponse = {
  id: 'promptuna_123',
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 25,
    completion_tokens: 10,
    total_tokens: 35,
  },
};

export const mockStructuredResponse: ChatCompletionResponse = {
  id: 'promptuna_structured_123',
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify({
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        }),
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 45,
    completion_tokens: 20,
    total_tokens: 65,
  },
};

export const mockErrorResponse = {
  error: {
    message: 'Invalid API key',
    type: 'invalid_request_error',
    param: null,
    code: 'invalid_api_key',
  },
};

export const mockRateLimitResponse = {
  error: {
    message: 'Rate limit exceeded',
    type: 'rate_limit_error',
    param: null,
    code: 'rate_limit_exceeded',
  },
};

export const mockNetworkError = new Error('Network error: ECONNREFUSED');
export const mockTimeoutError = new Error('Request timeout');
export const mockAuthError = new Error('Authentication failed');