import { readFile } from 'fs/promises';
import { Liquid } from 'liquidjs';
import {
  PromptunaConfig,
  ConfigurationError,
  Variant,
} from '../config/types.js';
import {
  SUPPORTED_SCHEMA_VERSIONS,
  isSchemaVersionSupported,
} from '../version.js';
import {
  registerCustomFilters,
  getTemplateSuggestion,
} from '../templates/filters.js';
import validateSchema from './compiled-validator.js';

/**
 * Sync validation function for already-loaded config data
 * @param config Raw config object to validate
 * @returns Validated PromptunaConfig object
 * @throws ConfigurationError if validation fails
 */
export function validateConfig(config: unknown): PromptunaConfig {
  // First run JSON Schema validation (sync)
  const isValid = validateSchema(config);

  if (!isValid) {
    const errors = validateSchema.errors?.map((error: any) => ({
      message: error.message || 'Unknown error',
      path: error.instancePath || '/',
      keyword: error.keyword || 'unknown',
      allowedValues: error.params?.allowedValues,
      missingProperty: error.params?.missingProperty,
      additionalProperty: error.params?.additionalProperty,
    }));

    throw new ConfigurationError('Configuration validation failed', {
      errors,
      validationStage: 'schema',
    });
  }

  // Cast to typed config for business logic validation
  const typedConfig = config as PromptunaConfig;

  // Run business logic validation (these remain sync)
  validateVersion(typedConfig);
  validateDefaultVariants(typedConfig);
  validateRequiredParameters(typedConfig);
  validateTemplates(typedConfig);

  return typedConfig;
}

/**
 * Async function to load and validate config from file
 * @param configPath Path to the configuration file
 * @returns Promise resolving to validated PromptunaConfig
 * @throws ConfigurationError if file loading or validation fails
 */
export async function loadAndValidateConfig(
  configPath: string
): Promise<PromptunaConfig> {
  try {
    // Read and parse JSON (async)
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Validate using sync function
    return validateConfig(config);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    // Handle file reading and JSON parsing errors
    throw new ConfigurationError(`Failed to load config file: ${configPath}`, {
      configPath,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * Check if the configuration version is supported
 * @private
 */
function validateVersion(config: PromptunaConfig): void {
  const versionMatch = config.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!versionMatch) {
    throw new ConfigurationError(
      `Invalid version format: ${config.version}. Expected semantic version (e.g., "1.0.0")`,
      {
        version: config.version,
        expectedFormat: 'X.Y.Z (semantic versioning)',
      }
    );
  }

  if (!isSchemaVersionSupported(config.version)) {
    throw new ConfigurationError(
      `Unsupported schema version: ${config.version}. Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}`,
      {
        version: config.version,
        supportedVersions: SUPPORTED_SCHEMA_VERSIONS,
      }
    );
  }
}

/**
 * Validates that each prompt has exactly one default variant (critical for routing)
 * @private
 */
function validateDefaultVariants(config: PromptunaConfig): void {
  for (const [promptId, prompt] of Object.entries(config.prompts)) {
    const defaultVariants = Object.entries(prompt.variants || {}).filter(
      ([_, variant]) => (variant as Variant).default === true
    );

    if (defaultVariants.length === 0) {
      throw new ConfigurationError(
        `Prompt "${promptId}" must have exactly one variant with default: true`,
        {
          promptId,
          availableVariants: Object.keys(prompt.variants || {}),
        }
      );
    }

    if (defaultVariants.length > 1) {
      throw new ConfigurationError(
        `Prompt "${promptId}" has multiple default variants. Only one variant can have default: true`,
        {
          promptId,
          defaultVariants: defaultVariants.map(([id]) => id),
        }
      );
    }
  }
}

/**
 * Ensures each variant includes mandatory parameters for its provider (critical for execution)
 * @private
 */
function validateRequiredParameters(config: PromptunaConfig): void {
  // Minimal hard-coded rules per provider type
  const REQUIRED: Record<string, string[]> = {
    openai: [],
    anthropic: ['max_tokens'],
    google: [],
  };

  for (const [promptId, prompt] of Object.entries(config.prompts)) {
    for (const [variantId, variant] of Object.entries(prompt.variants)) {
      const provider = config.providers[variant.provider];
      if (!provider) {
        throw new ConfigurationError(
          `Variant "${variantId}" references non-existent provider "${variant.provider}"`,
          {
            promptId,
            variantId,
            invalidProvider: variant.provider,
            availableProviders: Object.keys(config.providers),
          }
        );
      }

      const needed = REQUIRED[provider.type] ?? [];
      const params = variant.parameters ?? {};
      const missing = needed.filter(key => !(key in params));

      if (missing.length) {
        throw new ConfigurationError(
          `Variant "${variantId}" of prompt "${promptId}" is missing required parameter(s) for provider "${provider.type}": ${missing.join(', ')}`
        );
      }
    }
  }
}

/**
 * Validates that all templates in the configuration have valid syntax
 * @private
 */
function validateTemplates(config: PromptunaConfig): void {
  // Use LiquidJS for template validation
  const liquid = new Liquid({
    strictVariables: false,
    strictFilters: true, // Enable strict filters for validation
  });

  // Register custom filters to match TemplateProcessor
  registerCustomFilters(liquid);

  for (const [promptId, prompt] of Object.entries(config.prompts)) {
    for (const [variantId, variant] of Object.entries(prompt.variants)) {
      const typedVariant = variant as Variant;

      if (typedVariant.messages && Array.isArray(typedVariant.messages)) {
        for (const [messageIndex, message] of typedVariant.messages.entries()) {
          if (message.content?.template) {
            try {
              // Parse the template to validate syntax
              liquid.parse(message.content.template);
            } catch (error: any) {
              throw new ConfigurationError(
                `Template syntax error in prompt "${promptId}", variant "${variantId}", message ${messageIndex}: ${error.message}`,
                {
                  promptId,
                  variantId,
                  messageIndex,
                  template: message.content.template,
                  error: error.message,
                  suggestion: getTemplateSuggestion(error.message),
                }
              );
            }
          }
        }
      }
    }
  }
}

// Export types for convenience
export type { PromptunaConfig, ConfigurationError } from '../config/types.js';
