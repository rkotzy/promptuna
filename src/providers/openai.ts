import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';
import { ProviderError } from '../errors';

export class OpenAIProvider implements Provider {
  private client: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async initializeClient() {
    if (this.client) return;

    try {
      // @ts-ignore - Optional dependency
      const OpenAI = (await import('openai')).default;
      this.client = new OpenAI({ apiKey: this.apiKey });
    } catch (error: any) {
      if (
        error.code === 'MODULE_NOT_FOUND' ||
        error.message?.includes('Cannot find module')
      ) {
        throw new Error(
          'OpenAI SDK not installed. Please run: npm install openai'
        );
      }
      throw error;
    }
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    await this.initializeClient();

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const { model, messages, ...rest } = options;

      const response = await this.client.chat.completions.create({
        model,
        messages,
        ...rest,
      });

      return {
        id: response.id,
        model: response.model,
        choices: response.choices.map((choice: any) => ({
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: choice.finish_reason,
          index: choice.index,
        })),
        usage: response.usage
          ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error: any) {
      // Normalize into ProviderError – prefer HTTP status codes for mapping
      const message: string = error?.message ?? 'OpenAI API error';
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
}
