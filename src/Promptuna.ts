import { resolve } from 'path';
import packageJson from '../package.json';
import type { PromptunaObservability } from './observability/types';
import { ConfigLoader } from './config/loader';
import {
  PromptunaConfig,
  PromptunaRuntimeConfig,
  ExecutionError,
  Variant,
  Prompt,
  ChatCompletionParams,
  GetTemplateParams,
} from './config/types.js';
import { RenderedMessage } from './templates/types';
import { TemplateProcessor } from './templates/processor';
import {
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
  Provider,
} from './providers/types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { ObservabilityBuilder } from './observability/builder';
import { selectVariant } from './routing/selector';
import { executeWithFallback } from './fallbacks/executor';
import { buildProviderParams } from './shared/utils/normalizeParameters';
import type { ProviderId } from './shared/types';

export class Promptuna {
  protected configPath: string;
  protected loader: ConfigLoader;
  protected templateProcessor: TemplateProcessor;
  protected config: PromptunaConfig | null = null;
  protected configPromise: Promise<PromptunaConfig> | null = null;
  protected providers: Map<string, any> = new Map();
  protected runtimeConfig: PromptunaRuntimeConfig;

  // Observability helpers
  protected sdkVersion: string;
  protected environment: 'dev' | 'prod';
  protected emitObservability?: (event: PromptunaObservability) => void;

  constructor(config: PromptunaRuntimeConfig) {
    this.runtimeConfig = config;
    this.configPath = resolve(config.configPath);
    this.loader = new ConfigLoader();
    this.templateProcessor = new TemplateProcessor();

    this.sdkVersion = (packageJson as any).version ?? 'unknown';

    this.environment = config.environment ?? 'dev';
    this.emitObservability = config.onObservability;
  }

  /**
   * Returns the cached configuration, loading and validating it on first access.
   * If multiple calls happen concurrently before the first load completes, they
   * will all await the same in-flight Promise.
   * @private
   * @returns The validated configuration object
   * @throws ConfigurationError if the configuration is invalid or cannot be loaded
   */
  private async getConfig(): Promise<PromptunaConfig> {
    if (this.config) {
      return this.config;
    }

    if (!this.configPromise) {
      this.configPromise = this.loader
        .loadConfigFile(this.configPath)
        .then(config => {
          this.config = config;
          return config;
        });
    }

    return this.configPromise;
  }

  /**
   * Gets a template with variables interpolated
   * @param params Parameters for getting the template
   * @returns Array of rendered messages with content ready for LLM
   * @throws ExecutionError if prompt/variant not found or invalid message format
   * @throws TemplateError if template processing fails
   */
  async getTemplate(params: GetTemplateParams): Promise<RenderedMessage[]> {
    const { promptId, variantId, variables = {} } = params;
    const config = await this.getConfig();

    // Validate prompt & variant
    const prompt: Prompt | undefined = config.prompts[promptId];
    if (!prompt) {
      throw new ExecutionError(`Prompt not found`, {
        promptId,
        availablePrompts: Object.keys(config.prompts),
      });
    }

    const variant = prompt.variants?.[variantId] as Variant;
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
   * Gets or creates a provider instance
   * @private
   */
  private getProvider(type: string): Provider {
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
   * @param params Parameters for the chat completion
   * @returns The chat completion response from the LLM provider
   * @throws ExecutionError if prompt not found or provider fails
   */
  async chatCompletion(
    params: ChatCompletionParams
  ): Promise<ChatCompletionResponse> {
    const {
      promptId,
      variables = {},
      messageHistory = [],
      userId,
      tags = [],
      unixTime = Math.floor(Date.now() / 1000),
    } = params;

    // Observability builder created at function start to capture full E2E timing
    const obsBuilder = new ObservabilityBuilder({
      sdkVersion: this.sdkVersion,
      environment: this.environment,
      promptId,
      userId,
      variantId: 'unknown',
      routingReason: 'default',
      emit: this.emitObservability,
    });

    let variantId: string | 'unknown' = 'unknown';
    let lastProviderType: string = 'unknown';

    try {
      const config = await this.getConfig();

      // Fetch prompt definition
      const prompt: Prompt | undefined = config.prompts[promptId];
      if (!prompt) {
        throw new ExecutionError(`Prompt not found`, {
          promptId,
          availablePrompts: Object.keys(config.prompts),
        });
      }

      // ---------------------- routing & selection ----------------------
      const {
        variantId: selectedId,
        variant,
        reason,
        weightPicked,
      } = selectVariant({ prompt, promptId, userId, tags, now: unixTime });

      variantId = selectedId; // for error paths

      // update builder routing info
      obsBuilder.setVariantId(selectedId);
      obsBuilder.setRouting(reason, tags.length ? tags : undefined);
      if (weightPicked !== undefined) {
        obsBuilder.setExperimentContext({
          tags,
          weightedSelection: true,
          selectedWeight: weightPicked,
        });
      }

      // Render template
      const messages = await this.getTemplate({
        promptId,
        variantId: selectedId,
        variables,
      });
      obsBuilder.markTemplate();

      // ---------------------- fallback execution ----------------------
      // Build **ordered** list of provider/model combos to attempt.
      // 1) primary variant itself
      // 2) any fallback targets defined in the variant
      type BasicTarget = { providerId: string; model: string };

      const primaryTarget: BasicTarget = {
        providerId: variant.provider,
        model: variant.model,
      };

      const fallbackTargets: BasicTarget[] = (variant.fallback ?? []).map(
        fb => ({
          providerId: fb.provider,
          model: fb.model,
        })
      );

      // Enrich each target with its concrete provider type ("openai", "anthropic", ...)
      const targets = [primaryTarget, ...fallbackTargets].map(target => {
        const providerCfg = config.providers[target.providerId];

        if (!providerCfg) {
          // Configuration error – provider referenced in variant but not declared globally
          throw new ExecutionError(`Provider configuration not found`, {
            promptId,
            variantId: selectedId,
            providerId: target.providerId,
            availableProviders: Object.keys(config.providers),
          });
        }

        return {
          ...target,
          providerType: providerCfg.type, // Ensures we know which concrete SDK class to instantiate
        };
      });

      // Transform rendered template messages to ChatMessage format
      const templateMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Combine message history with template messages
      const chatMessages: ChatMessage[] = [
        ...messageHistory,
        ...templateMessages,
      ];

      // Get response schema if needed (validation guarantees it exists)
      const responseSchema =
        variant.responseFormat?.type === 'json_schema'
          ? config.responseSchemas?.[variant.responseFormat.schemaRef!]
          : undefined;

      const response = await executeWithFallback<ChatCompletionResponse>(
        targets,
        async (provider, target) => {
          const providerParams = buildProviderParams(
            target.providerType as ProviderId,
            variant.parameters ?? {}
          );

          const options: ChatCompletionOptions = {
            messages: chatMessages,
            model: target.model,
            userId,
            responseFormat: variant.responseFormat,
            responseSchema,
            ...providerParams,
          };

          const res = await provider.chatCompletion(options);
          return res;
        },
        (type: string) => this.getProvider(type),
        ctx => {
          if (ctx.error) {
            obsBuilder.addFallbackAttempt({
              provider: ctx.target.providerType,
              model: ctx.target.model,
              reason: ctx.error.reason,
            });
          } else {
            // Successful attempt – record provider used
            obsBuilder.setProvider(ctx.target.providerType, ctx.target.model);
            lastProviderType = ctx.target.providerType;
          }
        }
      );

      // Success telemetry
      obsBuilder.markProvider();
      obsBuilder.setProviderRequestId(response.id);
      obsBuilder.setTokenUsage(response.usage);
      obsBuilder.buildSuccess();

      return response;
    } catch (error: any) {
      obsBuilder.markProvider();
      obsBuilder.buildError(error);

      const errorDetails = {
        promptId,
        variantId,
        provider: lastProviderType,
        originalError: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name ?? 'Error',
        ...(error?.code && { errorCode: error.code }),
        ...(error?.details && { providerDetails: error.details }),
      };

      throw new ExecutionError(
        `Chat completion failed for ${lastProviderType}: ${error instanceof Error ? error.message : String(error)}`,
        errorDetails
      );
    }
  }
}
