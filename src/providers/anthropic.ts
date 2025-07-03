import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';
import { ProviderError } from '../errors';

export class AnthropicProvider implements Provider {
  private client: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async initializeClient() {
    if (this.client) return;

    try {
      // @ts-ignore - Optional dependency
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({ apiKey: this.apiKey });
    } catch (error: any) {
      if (
        error.code === 'MODULE_NOT_FOUND' ||
        error.message?.includes('Cannot find module')
      ) {
        throw new Error(
          'Anthropic SDK not installed. Please run: npm install @anthropic-ai/sdk'
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
      throw new Error('Anthropic client not initialized');
    }

    try {
      // Transform messages to Anthropic format
      const { system, messages } = this.transformMessages(options.messages);

      const response = await this.client.messages.create({
        model: options.model,
        messages: messages,
        system: system,
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature,
      });

      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        model: options.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.content[0].text,
            },
            finish_reason: response.stop_reason || 'stop',
            index: 0,
          },
        ],
        usage: response.usage
          ? {
              prompt_tokens: response.usage.input_tokens,
              completion_tokens: response.usage.output_tokens,
              total_tokens:
                response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
      };
    } catch (error: any) {
      // Normalize Anthropic errors via HTTP status if present
      const message: string = error?.message ?? 'Anthropic API error';
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
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    const system =
      systemMessages.length > 0
        ? systemMessages.map(msg => msg.content).join('\n\n')
        : undefined;

    const anthropicMessages = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    return { system, messages: anthropicMessages };
  }
}
