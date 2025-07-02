import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';

export class OpenAIProvider implements Provider {
  private client: any;

  constructor(apiKey: string) {
    this.initializeClient(apiKey);
  }

  private async initializeClient(apiKey: string) {
    try {
      // @ts-ignore - Optional dependency
      const OpenAI = (await import('openai')).default;
      this.client = new OpenAI({ apiKey });
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
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
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
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}
