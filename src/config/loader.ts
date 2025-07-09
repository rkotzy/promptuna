import { readFile } from 'fs/promises';
import { PromptunaConfig, ConfigurationError, Variant } from './types';
import {
  SUPPORTED_SCHEMA_VERSIONS,
  isSchemaVersionSupported,
} from '../version';

/**
 * Lightweight configuration loader for production environments.
 * Performs only essential validation without schema validation dependencies.
 * Use this in production environments where package size is a concern.
 * For full validation or development, use the promptuna/validate package.
 */
export class ConfigLoader {
  /**
   * Load and validate a configuration file with minimal validation
   * @param configPath Path to the configuration file
   * @returns Validated configuration object
   */
  async loadConfigFile(configPath: string): Promise<PromptunaConfig> {
    try {
      // Read and parse JSON
      const configContent = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Perform essential validation only
      const typedConfig = config as PromptunaConfig;
      this.checkSchemaVersion(typedConfig);
      this.validateDefaultVariants(typedConfig);
      this.validateRequiredParameters(typedConfig);

      return typedConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      // Handle file reading and JSON parsing errors
      throw new ConfigurationError(
        `Failed to load config file: ${configPath}`,
        {
          configPath,
          error: error instanceof Error ? error.message : error,
        }
      );
    }
  }

  /**
   * Check if the configuration version is supported
   * @private
   */
  private checkSchemaVersion(config: PromptunaConfig): void {
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
  private validateDefaultVariants(config: PromptunaConfig): void {
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
  private validateRequiredParameters(config: PromptunaConfig): void {
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
}
