import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';
import { ProviderError } from '../errors';

export class GoogleProvider implements Provider {
  private genAI: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async initializeClient() {
    if (this.genAI) return;

    try {
      // @ts-ignore - Optional dependency
      const { GoogleGenAI } = await import('@google/genai');
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    } catch (error: any) {
      if (
        error.code === 'MODULE_NOT_FOUND' ||
        error.message?.includes('Cannot find module')
      ) {
        throw new Error(
          'Google GenAI SDK not installed. Please run: npm install @google/genai'
        );
      }
      throw error;
    }
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    await this.initializeClient();

    if (!this.genAI) {
      throw new Error('Google client not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: options.model });

      // Transform messages to Google format
      const contents = this.transformMessages(options.messages);

      const { model: _m, messages: _msgs, userId, responseFormat, responseSchema, ...rest } = options; // We dump messages and model since they're re-defined with above functions

      const generationConfig: any = { ...rest };

      // Handle structured response format
      if (responseFormat?.type === 'json_schema' && responseSchema) {
        generationConfig.responseSchema = responseSchema;
        generationConfig.responseMimeType = 'application/json';
      }

      const response = await model.generateContent({
        contents,
        generationConfig,
      });

      const result = await response.response;

      return {
        id: result.responseId,
        model: options.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: result.text(),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: result.usageMetadata
          ? {
              prompt_tokens: result.usageMetadata.promptTokenCount || 0,
              completion_tokens: result.usageMetadata.candidatesTokenCount || 0,
              total_tokens: result.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    } catch (error: any) {
      const message: string = error?.message ?? 'Google API error';
      const status: number | undefined = error?.status ?? error?.httpStatus;

      let reason: 'provider-error' | 'timeout' | 'rate-limit' =
        'provider-error';
      let retryable = false;

      if (status === 429) {
        reason = 'rate-limit';
        retryable = true;
      } else if (status === 408 || status === 504) {
        reason = 'timeout';
        retryable = true;
      }

      throw new ProviderError(reason, message, retryable, error?.code, status);
    }
  }

  private transformMessages(messages: any[]) {
    if (messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Convert messages to Google format
    const contents = conversationMessages.map((msg, index) => {
      const googleRole = msg.role === 'assistant' ? 'model' : 'user';
      let content = msg.content;

      // Prepend system message to first user message if system messages exist
      if (index === 0 && msg.role === 'user' && systemMessages.length > 0) {
        const systemContent = systemMessages.map(s => s.content).join('\n\n');
        content = `${systemContent}\n\n${content}`;
      }

      return {
        role: googleRole,
        parts: [{ text: content }],
      };
    });

    return contents;
  }
}
