import { resolve } from 'path';
import { ConfigValidator } from './validators/configValidator';
import {
  PromptunaConfig,
  PromptunaRuntimeConfig,
  RenderedMessage,
  ExecutionError,
} from './types/config';
import { TemplateProcessor } from './processors/templateProcessor';
import {
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
} from './providers/types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';

export class Promptuna {
  private configPath: string;
  private validator: ConfigValidator;
  private templateProcessor: TemplateProcessor;
  private config: PromptunaConfig | null = null;
  private configPromise: Promise<PromptunaConfig> | null = null;
  private providers: Map<string, any> = new Map();
  private runtimeConfig: PromptunaRuntimeConfig;

  constructor(config: PromptunaRuntimeConfig) {
    this.runtimeConfig = config;
    this.configPath = resolve(config.configPath);
    this.validator = new ConfigValidator();
    this.templateProcessor = new TemplateProcessor();
  }

  /**
   * Loads and validates the configuration file against the Promptuna schema
   * Always re-reads the file and updates the internal cache
   * @returns The validated configuration object
   * @throws ConfigurationError if the configuration is invalid or cannot be loaded
   */
  async loadAndValidateConfig(): Promise<PromptunaConfig> {
    this.config = await this.validator.validateAndLoadConfigFile(
      this.configPath
    );
    return this.config;
  }

  /**
   * Returns the cached configuration, loading and validating it on first access.
   * If multiple calls happen concurrently before the first load completes, they
   * will all await the same in-flight Promise.
   * @returns The validated configuration object
   * @throws ConfigurationError if the configuration is invalid or cannot be loaded
   */
  private async getConfig(): Promise<PromptunaConfig> {
    if (this.config) {
      return this.config;
    }

    if (!this.configPromise) {
      this.configPromise = this.loadAndValidateConfig();
    }

    this.config = await this.configPromise;
    this.configPromise = null;

    return this.config;
  }

  /**
   * Gets a variant template with variables interpolated
   * @param promptId The ID of the prompt
   * @param variantId The ID of the variant within the prompt
   * @param variables Variables to interpolate into the template
   * @returns Array of rendered messages with content ready for LLM
   * @throws ExecutionError if prompt/variant not found or invalid message format
   * @throws TemplateError if template processing fails
   */
  async getVariantTemplate(
    promptId: string,
    variantId: string,
    variables: Record<string, any>
  ): Promise<RenderedMessage[]> {
    const config = await this.getConfig();

    // Find the prompt
    const prompt = config.prompts[promptId];
    if (!prompt) {
      throw new ExecutionError(`Prompt not found`, {
        promptId,
        availablePrompts: Object.keys(config.prompts),
      });
    }

    // Find the variant
    const variant = prompt.variants?.[variantId];
    if (!variant) {
      throw new ExecutionError(`Variant not found`, {
        promptId,
        variantId,
        availableVariants: Object.keys(prompt.variants || {}),
      });
    }

    // Process all messages in the variant
    const messages = variant.messages;
    if (!Array.isArray(messages)) {
      throw new ExecutionError(`Invalid messages format in variant`, {
        promptId,
        variantId,
        messagesType: typeof messages,
      });
    }

    const renderedMessages: RenderedMessage[] = [];

    for (const message of messages) {
      if (!message.role || !message.content?.template) {
        throw new ExecutionError(`Invalid message format in variant`, {
          promptId,
          variantId,
          messageStructure: {
            hasRole: !!message.role,
            hasContent: !!message.content,
            hasTemplate: !!message.content?.template,
          },
        });
      }

      const renderedContent = await this.templateProcessor.processTemplate(
        message.content.template,
        variables
      );

      renderedMessages.push({
        role: message.role,
        content: renderedContent,
      });
    }

    return renderedMessages;
  }

  /**
   * Gets or creates a provider instance
   * @private
   */
  private getProvider(type: string): any {
    if (this.providers.has(type)) {
      return this.providers.get(type);
    }

    let provider;
    switch (type) {
      case 'openai':
        if (!this.runtimeConfig.openaiApiKey) {
          throw new Error('OpenAI API key not provided in configuration');
        }
        provider = new OpenAIProvider(this.runtimeConfig.openaiApiKey);
        break;
      case 'anthropic':
        if (!this.runtimeConfig.anthropicApiKey) {
          throw new Error('Anthropic API key not provided in configuration');
        }
        provider = new AnthropicProvider(this.runtimeConfig.anthropicApiKey);
        break;
      case 'google':
        if (!this.runtimeConfig.googleApiKey) {
          throw new Error('Google API key not provided in configuration');
        }
        provider = new GoogleProvider(this.runtimeConfig.googleApiKey);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(type, provider);
    return provider;
  }

  /**
   * Executes a chat completion using the specified variant
   * @param promptId The ID of the prompt
   * @param variantId The ID of the variant within the prompt
   * @param variables Variables to interpolate into the template
   * @returns The chat completion response from the LLM provider
   * @throws ExecutionError if prompt/variant not found or provider fails
   */
  async chatCompletion(
    promptId: string,
    variantId: string,
    variables: Record<string, any>
  ): Promise<ChatCompletionResponse> {
    const config = await this.getConfig();

    // Get the rendered messages
    const messages = await this.getVariantTemplate(
      promptId,
      variantId,
      variables
    );

    // Find the variant configuration
    const prompt = config.prompts[promptId];
    if (!prompt) {
      throw new ExecutionError(`Prompt not found`, {
        promptId,
        availablePrompts: Object.keys(config.prompts),
      });
    }

    const variant = prompt.variants?.[variantId];
    if (!variant) {
      throw new ExecutionError(`Variant not found`, {
        promptId,
        variantId,
        availableVariants: Object.keys(prompt.variants || {}),
      });
    }

    // Get the provider configuration
    const providerConfig = config.providers[variant.provider];
    if (!providerConfig) {
      throw new ExecutionError(`Provider configuration not found`, {
        promptId,
        variantId,
        providerId: variant.provider,
        availableProviders: Object.keys(config.providers),
      });
    }

    // Get the provider instance
    const provider = this.getProvider(providerConfig.type);

    // Transform messages to provider format
    const chatMessages: ChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Prepare options for chat completion
    const options: ChatCompletionOptions = {
      messages: chatMessages,
      model: variant.model,
      temperature: variant.parameters?.temperature,
      max_tokens: variant.parameters?.maxTokens,
    };

    try {
      return await provider.chatCompletion(options);
    } catch (error: any) {
      throw new ExecutionError(`Chat completion failed`, {
        promptId,
        variantId,
        provider: providerConfig.type,
        error: error.message,
      });
    }
  }
}
