import {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './types';

export class GoogleProvider implements Provider {
  private genAI: any;

  constructor(apiKey: string) {
    this.initializeClient(apiKey);
  }

  private async initializeClient(apiKey: string) {
    try {
      // @ts-ignore - Optional dependency
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.genAI = new GoogleGenerativeAI(apiKey);
    } catch (error: any) {
      if (
        error.code === 'MODULE_NOT_FOUND' ||
        error.message?.includes('Cannot find module')
      ) {
        throw new Error(
          'Google Generative AI SDK not installed. Please run: npm install @google/generative-ai'
        );
      }
      throw error;
    }
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    if (!this.genAI) {
      throw new Error('Google client not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: options.model });

      // Transform messages to Google format
      const { history, lastMessage } = this.transformMessages(options.messages);

      const chat = model.startChat({
        history: history,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.max_tokens,
        },
      });

      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;

      return {
        id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        model: options.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: response.text(),
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: response.usageMetadata
          ? {
              prompt_tokens: response.usageMetadata.promptTokenCount || 0,
              completion_tokens:
                response.usageMetadata.candidatesTokenCount || 0,
              total_tokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    } catch (error: any) {
      throw new Error(`Google API error: ${error.message}`);
    }
  }

  private transformMessages(messages: any[]) {
    if (messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const systemMessages = messages.filter(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Combine system messages with first user message for Google
    let history: Array<{ role: string; parts: string }> = [];
    let lastMessage = '';

    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i];
      const googleRole = msg.role === 'assistant' ? 'model' : 'user';

      let content = msg.content;
      if (i === 0 && systemMessages.length > 0) {
        // Prepend system message to first user message
        const systemContent = systemMessages.map(s => s.content).join('\n\n');
        content = `${systemContent}\n\n${content}`;
      }

      if (i === conversationMessages.length - 1) {
        lastMessage = content;
      } else {
        history.push({
          role: googleRole,
          parts: content,
        });
      }
    }

    return { history, lastMessage };
  }
}
