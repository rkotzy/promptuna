import { resolve } from "path";
import { ConfigValidator } from "./validators/configValidator";
import { PromptunaConfig, RenderedMessage, ExecutionError, ConfigurationError } from "./types/config";
import { TemplateProcessor } from "./processors/templateProcessor";

export class Promptuna {
  private configPath: string;
  private validator: ConfigValidator;
  private templateProcessor: TemplateProcessor;
  private config: PromptunaConfig | null = null;
  private configPromise: Promise<PromptunaConfig> | null = null;

  constructor(configPath: string) {
    this.configPath = resolve(configPath);
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
        availablePrompts: Object.keys(config.prompts)
      });
    }
    
    // Find the variant
    const variant = prompt.variants?.[variantId];
    if (!variant) {
      throw new ExecutionError(`Variant not found`, {
        promptId,
        variantId,
        availableVariants: Object.keys(prompt.variants || {})
      });
    }
    
    // Process all messages in the variant
    const messages = variant.messages;
    if (!Array.isArray(messages)) {
      throw new ExecutionError(`Invalid messages format in variant`, {
        promptId,
        variantId,
        messagesType: typeof messages
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
            hasTemplate: !!message.content?.template
          }
        });
      }
      
      const renderedContent = await this.templateProcessor.processTemplate(
        message.content.template,
        variables
      );
      
      renderedMessages.push({
        role: message.role,
        content: renderedContent
      });
    }
    
    return renderedMessages;
  }
}
