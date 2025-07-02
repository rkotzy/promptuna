import { resolve } from 'path';
import packageJson from '../package.json';
import type { PromptunaObservability } from './types/observability';
import { ConfigValidator } from './validators/configValidator';
import {
  PromptunaConfig,
  PromptunaRuntimeConfig,
  RenderedMessage,
  ExecutionError,
  Variant,
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
import { ObservabilityBuilder } from './utils/observabilityBuilder';

export class Promptuna {
  private configPath: string;
  private validator: ConfigValidator;
  private templateProcessor: TemplateProcessor;
  private config: PromptunaConfig | null = null;
  private configPromise: Promise<PromptunaConfig> | null = null;
  private providers: Map<string, any> = new Map();
  private runtimeConfig: PromptunaRuntimeConfig;

  // Observability helpers
  private sdkVersion: string;
  private environment: 'dev' | 'prod';
  private emitObservability?: (event: PromptunaObservability) => void;

  constructor(config: PromptunaRuntimeConfig) {
    this.runtimeConfig = config;
    this.configPath = resolve(config.configPath);
    this.validator = new ConfigValidator();
    this.templateProcessor = new TemplateProcessor();

    this.sdkVersion = (packageJson as any).version ?? 'unknown';

    this.environment = config.environment ?? 'dev';
    this.emitObservability = config.onObservability;
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
   * Gets a template with variables interpolated
   * @param promptId The ID of the prompt
   * @param variantId The ID of the variant within the prompt (optional - uses default if not provided)
   * @param variables Variables to interpolate into the template
   * @returns Array of rendered messages with content ready for LLM
   * @throws ExecutionError if prompt/variant not found or invalid message format
   * @throws TemplateError if template processing fails
   */
  async getTemplate(
    promptId: string,
    variantId?: string,
    variables?: Record<string, any>
  ): Promise<RenderedMessage[]> {
    const config = await this.getConfig();

    let variant: Variant;
    let selectedVariantId = variantId;

    if (!selectedVariantId) {
      // Use both the ID and variant from findDefaultVariant
      const [defaultVariantId, defaultVariant] =
        await this.findDefaultVariant(promptId);
      selectedVariantId = defaultVariantId;
      variant = defaultVariant;
    } else {
      // Only fetch variant when we have a specific variantId
      const prompt = config.prompts[promptId];
      if (!prompt) {
        throw new ExecutionError(`Prompt not found`, {
          promptId,
          availablePrompts: Object.keys(config.prompts),
        });
      }

      variant = prompt.variants?.[selectedVariantId] as Variant;
      if (!variant) {
        throw new ExecutionError(`Variant not found`, {
          promptId,
          variantId: selectedVariantId,
          availableVariants: Object.keys(prompt.variants || {}),
        });
      }
    }

    // Process all messages in the variant
    const messages = variant.messages;
    if (!Array.isArray(messages)) {
      throw new ExecutionError(`Invalid messages format in variant`, {
        promptId,
        variantId: selectedVariantId,
        messagesType: typeof messages,
      });
    }

    const renderedMessages: RenderedMessage[] = [];

    for (const message of messages) {
      if (!message.role || !message.content?.template) {
        throw new ExecutionError(`Invalid message format in variant`, {
          promptId,
          variantId: selectedVariantId,
          messageStructure: {
            hasRole: !!message.role,
            hasContent: !!message.content,
            hasTemplate: !!message.content?.template,
          },
        });
      }

      const renderedContent = await this.templateProcessor.processTemplate(
        message.content.template,
        variables || {}
      );

      renderedMessages.push({
        role: message.role,
        content: renderedContent,
      });
    }

    return renderedMessages;
  }

  /**
   * Finds the default variant for a given prompt
   * @private
   * @param promptId The ID of the prompt
   * @returns A tuple of [variantId, variant] for the default variant
   * @throws ExecutionError if prompt not found or no default variant exists
   */
  private async findDefaultVariant(
    promptId: string
  ): Promise<[string, Variant]> {
    const config = await this.getConfig();

    // Find the prompt
    const prompt = config.prompts[promptId];
    if (!prompt) {
      throw new ExecutionError(`Prompt not found`, {
        promptId,
        availablePrompts: Object.keys(config.prompts),
      });
    }

    // Find the default variant
    const defaultVariantEntry = Object.entries(prompt.variants || {}).find(
      ([_, variant]) => (variant as Variant).default === true
    );

    if (!defaultVariantEntry) {
      throw new ExecutionError(`No default variant found for prompt`, {
        promptId,
        availableVariants: Object.keys(prompt.variants || {}),
      });
    }

    return [defaultVariantEntry[0], defaultVariantEntry[1] as Variant];
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
   * Execute chat completion for a prompt (uses default variant)
   * @param promptId The ID of the prompt
   * @param variables Variables to interpolate into the template
   * @returns The chat completion response from the LLM provider
   * @throws ExecutionError if prompt not found or provider fails
   */
  async chatCompletion(
    promptId: string,
    variables?: Record<string, any>
  ): Promise<ChatCompletionResponse> {
    const obsBuilder = new ObservabilityBuilder({
      sdkVersion: this.sdkVersion,
      environment: this.environment,
      promptId,
      routingReason: 'default',
      emit: this.emitObservability,
    });

    // Will be filled once known so we can use in error path
    let variantId: string | 'unknown' = 'unknown';
    let providerConfig: any;

    try {
      const config = await this.getConfig();

      // Find the default variant
      const [variantId, variant] = await this.findDefaultVariant(promptId);

      // Update builder with variant
      obsBuilder.setVariantId(variantId);

      const messages = await this.getTemplate(promptId, variantId, variables);

      obsBuilder.markTemplate();

      // Get the provider configuration
      providerConfig = config.providers[variant.provider];
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

      // record provider details before call
      obsBuilder.setProvider(providerConfig.type, variant.model);

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
        max_tokens: variant.parameters?.max_tokens,
      };

      const response = await provider.chatCompletion(options);

      // Success telemetry
      obsBuilder.markProvider();
      obsBuilder.setProviderRequestId(response.id);
      obsBuilder.setTokenUsage(response.usage);
      obsBuilder.buildSuccess();

      return response;
    } catch (error: any) {
      obsBuilder.markProvider();
      obsBuilder.buildError(error);

      // Preserve original error information
      const errorDetails = {
        promptId,
        variantId,
        provider: providerConfig?.type ?? 'unknown',
        originalError: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name ?? 'Error',
        ...(error?.code && { errorCode: error.code }),
        ...(error?.details && { providerDetails: error.details }),
      };

      throw new ExecutionError(
        `Chat completion failed for ${providerConfig?.type ?? 'provider'}: ${error instanceof Error ? error.message : String(error)}`,
        errorDetails
      );
    }
  }
}
