export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

import type { ResponseFormat } from '../responses/types';

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model: string;
  userId?: string;
  responseFormat?: ResponseFormat;
  responseSchema?: any; // Resolved JSON schema for json_schema type
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  logit_bias?: Record<string, number>;
  [key: string]: any; // Allow arbitrary parameters since we will transform these into provider-specific params
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string | null;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Provider {
  chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;
}
