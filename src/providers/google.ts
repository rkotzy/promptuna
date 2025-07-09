import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';
import { ProviderError } from '../errors';

export class GoogleProvider implements Provider {
  private ai: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async initializeClient() {
    if (this.ai) return;

    try {
      // @ts-ignore - Optional dependency
      const { GoogleGenAI } = await import('@google/genai');
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
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

    if (!this.ai) {
      throw new Error('Google client not initialized');
    }

    try {
      // Transform messages to get contents and system instruction
      const { contents, systemInstruction } = this.transformMessages(
        options.messages
      );

      const {
        model,
        messages: _msgs,
        userId,
        responseFormat,
        responseSchema,
        ...rest
      } = options;

      // Build config object
      const config: any = { ...rest };

      // Add system instruction if present
      if (systemInstruction) {
        config.systemInstruction = [systemInstruction];
      }

      // Handle structured response format
      if (responseFormat?.type === 'json_schema' && responseSchema) {
        config.responseSchema = responseSchema;
        config.responseMimeType = 'application/json';
      }

      // Use the correct API structure
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config,
      });

      return {
        id: response.id || 'google-response',
        model: options.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.text,
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: response.usage
          ? {
              prompt_tokens: response.usage.promptTokens || 0,
              completion_tokens: response.usage.completionTokens || 0,
              total_tokens: response.usage.totalTokens || 0,
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

  private transformMessages(messages: any[]): {
    contents: string;
    systemInstruction?: string;
  } {
    if (messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Create system instruction from system messages
    const systemInstruction =
      systemMessages.length > 0
        ? systemMessages.map(s => s.content).join('\n\n')
        : undefined;

    // Convert conversation messages to a single string prompt
    // For the @google/genai API, contents should be a string
    const contents = conversationMessages
      .map(msg => {
        const rolePrefix = msg.role === 'assistant' ? 'Assistant: ' : 'User: ';
        return `${rolePrefix}${msg.content}`;
      })
      .join('\n\n');

    return { contents, systemInstruction };
  }
}
