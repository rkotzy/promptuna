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
 * Converts a JSON path to a human-readable location description
 */
function formatErrorPath(path: string): string {
  if (!path || path === '/') return 'at the root level';

  const parts = path.split('/').filter(Boolean);
  const readable: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    if (part === 'prompts' && nextPart) {
      readable.push(`in prompt "${nextPart}"`);
      i++; // skip the next part since we consumed it
    } else if (part === 'variants' && nextPart) {
      readable.push(`variant "${nextPart}"`);
      i++;
    } else if (part === 'providers' && nextPart) {
      readable.push(`in provider "${nextPart}"`);
      i++;
    } else if (part === 'messages' && nextPart) {
      readable.push(`message ${parseInt(nextPart) + 1}`);
      i++;
    } else if (part === 'routing') {
      readable.push('in routing configuration');
    } else if (part === 'parameters') {
      readable.push('in parameters');
    } else {
      readable.push(`field "${part}"`);
    }
  }

  return readable.length > 0 ? readable.join(', ') : `at path ${path}`;
}

/**
 * Translates technical AJV errors into user-friendly messages
 */
function translateSchemaError(error: any): string {
  const location = formatErrorPath(error.instancePath);
  const field = error.instancePath?.split('/').pop() || 'field';

  switch (error.keyword) {
    case 'required':
      const missingProperty = error.params?.missingProperty;
      if (missingProperty === 'version') {
        return `❌ Missing required field: Your configuration must include a "version" field at the top level. Add: "version": "1.0.0"`;
      } else if (missingProperty === 'providers') {
        return `❌ Missing required field: Your configuration must include a "providers" section to define your LLM providers.`;
      } else if (missingProperty === 'prompts') {
        return `❌ Missing required field: Your configuration must include a "prompts" section to define your prompts.`;
      } else if (missingProperty === 'type') {
        return `❌ Missing provider type: ${location} must specify a "type" field. Use "openai", "anthropic", or "google".`;
      } else if (missingProperty === 'provider') {
        return `❌ Missing provider reference: ${location} must specify which "provider" to use.`;
      } else if (missingProperty === 'model') {
        return `❌ Missing model: ${location} must specify a "model" field (e.g., "gpt-4", "claude-3-5-sonnet-20241022").`;
      } else if (missingProperty === 'messages') {
        return `❌ Missing messages: ${location} must include a "messages" array with at least one message.`;
      } else if (missingProperty === 'routing') {
        return `❌ Missing routing: ${location} must include routing configuration with rules.`;
      }
      return `❌ Missing required field "${missingProperty}": ${location} is missing the required field "${missingProperty}".`;

    case 'enum':
      const allowedValues = error.params?.allowedValues;
      if (allowedValues && field === 'type') {
        return `❌ Invalid provider type: ${location} has an invalid type. Allowed values are: ${allowedValues.map((v: string) => `"${v}"`).join(', ')}.`;
      }
      return `❌ Invalid value: ${location} has an invalid value. Allowed values are: ${allowedValues?.map((v: string) => `"${v}"`).join(', ') || 'see documentation'}.`;

    case 'additionalProperties':
      const additionalProperty = error.params?.additionalProperty;
      return `❌ Unknown field: Found unexpected field "${additionalProperty}" ${location}. Remove this field or check for typos.`;

    case 'type':
      const expectedType = error.schema?.type || 'correct type';
      return `❌ Wrong data type: ${location} should be ${expectedType} but got ${typeof error.data}.`;

    case 'pattern':
      if (error.schemaPath?.includes('#/$defs/id')) {
        return `❌ Invalid ID format: ${location} contains invalid characters. IDs can only contain letters, numbers, underscores, and hyphens.`;
      }
      return `❌ Invalid format: ${location} doesn't match the required pattern.`;

    case 'minItems':
      return `❌ Too few items: ${location} must have at least ${error.params?.limit} item(s).`;

    case 'uniqueItems':
      return `❌ Duplicate items: ${location} contains duplicate values, but all items must be unique.`;

    default:
      return `❌ Validation error: ${location} - ${error.message || 'Invalid configuration'}`;
  }
}

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
    // Convert technical AJV errors into user-friendly messages
    const userFriendlyErrors = validateSchema.errors?.map(
      translateSchemaError
    ) || ['Configuration validation failed with unknown errors'];

    throw new ConfigurationError('Configuration validation failed', {
      errors: userFriendlyErrors,
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
      `❌ Invalid version format: "${config.version}" is not a valid semantic version. Use format "X.Y.Z" like "1.0.0".`,
      {
        errors: [
          `❌ Invalid version format: "${config.version}" is not a valid semantic version. Use format "X.Y.Z" like "1.0.0".`,
        ],
        version: config.version,
        expectedFormat: 'X.Y.Z (semantic versioning)',
      }
    );
  }

  if (!isSchemaVersionSupported(config.version)) {
    throw new ConfigurationError(
      `❌ Unsupported schema version: Version "${config.version}" is not supported by this SDK. Use one of: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
      {
        errors: [
          `❌ Unsupported schema version: Version "${config.version}" is not supported by this SDK. Use one of: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
        ],
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
  const errors: string[] = [];

  for (const [promptId, prompt] of Object.entries(config.prompts)) {
    const defaultVariants = Object.entries(prompt.variants || {}).filter(
      ([_, variant]) => (variant as Variant).default === true
    );

    if (defaultVariants.length === 0) {
      const availableVariants = Object.keys(prompt.variants || {});
      if (availableVariants.length === 1) {
        errors.push(
          `❌ Missing default variant: Prompt "${promptId}" needs a default variant. Add "default": true to variant "${availableVariants[0]}".`
        );
      } else {
        errors.push(
          `❌ Missing default variant: Prompt "${promptId}" must have exactly one variant with "default": true. Choose one of: ${availableVariants.join(', ')}.`
        );
      }
    }

    if (defaultVariants.length > 1) {
      const defaultVariantIds = defaultVariants.map(([id]) => id);
      errors.push(
        `❌ Multiple default variants: Prompt "${promptId}" has ${defaultVariants.length} variants marked as default (${defaultVariantIds.join(', ')}). Only one variant can have "default": true.`
      );
    }
  }

  if (errors.length > 0) {
    throw new ConfigurationError('Default variant validation failed', {
      errors,
    });
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

  const errors: string[] = [];

  for (const [promptId, prompt] of Object.entries(config.prompts)) {
    for (const [variantId, variant] of Object.entries(prompt.variants)) {
      const provider = config.providers[variant.provider];
      if (!provider) {
        const availableProviders = Object.keys(config.providers);
        if (availableProviders.length === 0) {
          errors.push(
            `❌ Missing provider: Variant "${variantId}" in prompt "${promptId}" references provider "${variant.provider}", but no providers are defined. Add a providers section first.`
          );
        } else {
          errors.push(
            `❌ Invalid provider reference: Variant "${variantId}" in prompt "${promptId}" references non-existent provider "${variant.provider}". Available providers: ${availableProviders.join(', ')}.`
          );
        }
        continue;
      }

      const needed = REQUIRED[provider.type] ?? [];
      const params = variant.parameters ?? {};
      const missing = needed.filter(key => !(key in params));

      if (missing.length) {
        if (provider.type === 'anthropic' && missing.includes('max_tokens')) {
          errors.push(
            `❌ Missing required parameter: Anthropic provider requires "max_tokens" parameter in variant "${variantId}" of prompt "${promptId}". Add "parameters": { "max_tokens": 1000 } or similar.`
          );
        } else {
          errors.push(
            `❌ Missing required parameters: Variant "${variantId}" in prompt "${promptId}" is missing required parameter(s) for provider type "${provider.type}": ${missing.join(', ')}.`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ConfigurationError('Required parameter validation failed', {
      errors,
    });
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

  const errors: string[] = [];

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
              const suggestion = getTemplateSuggestion(error.message);
              const suggestionText = suggestion
                ? ` Suggestion: ${suggestion}`
                : '';
              errors.push(
                `❌ Template syntax error in prompt "${promptId}", variant "${variantId}", message ${messageIndex + 1}: ${error.message}.${suggestionText}`
              );
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ConfigurationError('Template validation failed', { errors });
  }
}

// Export types for convenience
export type { PromptunaConfig, ConfigurationError } from '../config/types.js';
