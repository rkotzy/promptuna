import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PromptunaConfig, ConfigurationError, Variant } from '../types/config';

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    message: string;
    path: string;
    keyword: string;
  }>;
}

export class ConfigValidator {
  private ajv: Ajv;
  private schemaPath: string;
  private validateFn: any = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      addUsedSchema: false,
    });
    addFormats(this.ajv);
    // Schema is at the root of the project
    this.schemaPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'schema.json'
    );
  }

  private async initializeValidator(): Promise<void> {
    try {
      const schemaContent = await readFile(this.schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      this.validateFn = this.ajv.compile(schema);
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load schema from ${this.schemaPath}`,
        {
          schemaPath: this.schemaPath,
          error: error instanceof Error ? error.message : error,
        }
      );
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.validateFn) return; // Already loaded

    if (!this.initPromise) {
      this.initPromise = this.initializeValidator();
    }

    return this.initPromise;
  }

  async validate(config: unknown): Promise<ValidationResult> {
    await this.ensureInitialized();

    const valid = this.validateFn(config);

    if (!valid) {
      const errors = this.validateFn.errors?.map((error: any) => ({
        message: error.message || 'Unknown error',
        path: error.instancePath || '/',
        keyword: error.keyword || 'unknown',
      }));

      return { valid: false, errors };
    }

    return { valid: true };
  }

  async validateAndLoadConfigFile(
    configPath: string
  ): Promise<PromptunaConfig> {
    try {
      await this.ensureInitialized();
      const configContent = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      const validation = await this.validate(config);
      if (!validation.valid) {
        throw new ConfigurationError(`Configuration validation failed`, {
          configPath,
          errors: validation.errors,
        });
      }

      // Additional validation checks
      const typedConfig = config as PromptunaConfig;
      this.validateDefaultVariants(typedConfig);
      this.validateResponseSchemas(typedConfig);
      this.validateRequiredParameters(typedConfig);
      this.validateWeightDistribution(typedConfig);

      return typedConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error; // Re-throw configuration errors as-is
      }

      // Handle file reading and JSON parsing errors
      throw new ConfigurationError(
        `Failed to read or parse config file: ${configPath}`,
        {
          configPath,
          error: error instanceof Error ? error.message : error,
        }
      );
    }
  }

  /** ----------------------------------------------------------
   *  Validation helpers
   * ----------------------------------------------------------
   */

  /**
   * Validates that each prompt has exactly one default variant
   * @private
   */
  private validateDefaultVariants(config: PromptunaConfig): void {
    for (const [promptId, prompt] of Object.entries(config.prompts)) {
      const defaultVariants = Object.entries(
        (prompt as any).variants || {}
      ).filter(([_, variant]) => (variant as Variant).default === true);

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
   * Validates that schema references in responseFormat actually exist and are valid JSON Schemas
   * @private
   */
  private validateResponseSchemas(config: PromptunaConfig): void {
    // First, validate that all schemas in responseSchemas are valid JSON Schemas
    if (config.responseSchemas) {
      for (const [schemaId, schema] of Object.entries(config.responseSchemas)) {
        try {
          // Use AJV to validate the schema against JSON Schema meta-schema
          this.ajv.validateSchema(schema);
          if (this.ajv.errors) {
            throw new ConfigurationError(
              `Invalid JSON Schema in responseSchemas["${schemaId}"]`,
              {
                schemaId,
                schemaErrors: this.ajv.errors.map(err => ({
                  message: err.message,
                  path: err.instancePath,
                  keyword: err.keyword,
                })),
              }
            );
          }
        } catch (error) {
          if (error instanceof ConfigurationError) {
            throw error;
          }
          throw new ConfigurationError(
            `Failed to validate JSON Schema in responseSchemas["${schemaId}"]`,
            {
              schemaId,
              error: error instanceof Error ? error.message : String(error),
            }
          );
        }
      }
    }

    // Then, validate that schema references exist and point to valid schemas
    for (const [promptId, prompt] of Object.entries(config.prompts)) {
      for (const [variantId, variant] of Object.entries(prompt.variants)) {
        if (variant.responseFormat?.type === 'json_schema') {
          const schemaRef = variant.responseFormat.schemaRef;
          if (!schemaRef) {
            throw new ConfigurationError(
              `Variant "${variantId}" in prompt "${promptId}" has json_schema response format but missing schemaRef`,
              {
                promptId,
                variantId,
                responseFormat: variant.responseFormat,
              }
            );
          }

          if (!config.responseSchemas?.[schemaRef]) {
            throw new ConfigurationError(
              `Schema reference "${schemaRef}" not found in responseSchemas`,
              {
                promptId,
                variantId,
                schemaRef,
                availableSchemas: Object.keys(config.responseSchemas || {}),
              }
            );
          }
        }
      }
    }
  }

  /**
   * Validates that routing rules have meaningful weight distributions
   * @private
   */
  private validateWeightDistribution(config: PromptunaConfig): void {
    for (const [promptId, prompt] of Object.entries(config.prompts)) {
      const rules = prompt.routing.rules;
      
      // Check if all weights are 0 in regular routing rules
      const hasNonZeroWeight = rules.some(rule => (rule.weight ?? 100) > 0);
      if (!hasNonZeroWeight) {
        throw new ConfigurationError(
          `Prompt "${promptId}" has all routing rules with weight 0. At least one rule must have weight > 0`,
          { 
            promptId, 
            rules: rules.map(r => ({ target: r.target, weight: r.weight ?? 100 })) 
          }
        );
      }
      
      // Check phased rules if they exist
      if (prompt.routing.phased) {
        for (const [phaseIndex, phasedRule] of prompt.routing.phased.entries()) {
          const weights = Object.values(phasedRule.weights);
          const hasNonZeroPhasedWeight = weights.some(weight => weight > 0);
          
          if (!hasNonZeroPhasedWeight) {
            throw new ConfigurationError(
              `Prompt "${promptId}" has phased rule ${phaseIndex} with all weights set to 0. At least one weight must be > 0`,
              {
                promptId,
                phaseIndex,
                phasedRule,
                weights: phasedRule.weights,
              }
            );
          }
        }
      }
    }
  }

  /**
   * Ensures each variant includes mandatory parameters for its provider.
   * For the MVP this is a hard-coded minimal list.
   */
  private validateRequiredParameters(config: PromptunaConfig): void {
    // Minimal hard-coded rules per provider type.
    const REQUIRED: Record<string, string[]> = {
      openai: [],
      anthropic: ['max_tokens'],
      google: [],
    };

    for (const [promptId, prompt] of Object.entries(config.prompts)) {
      for (const [variantId, variant] of Object.entries(prompt.variants)) {
        const provider = config.providers[variant.provider];
        if (!provider) continue; // global provider definition missing

        const needed = REQUIRED[provider.type] ?? [];
        if (needed.length === 0) continue; // nothing to validate for this provider

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
