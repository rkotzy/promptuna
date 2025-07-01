import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { PromptunaConfig, ConfigurationError } from "../types/config";

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
    this.schemaPath = resolve(dirname(__dirname), "..", "schema.json");
  }

  private async initializeValidator(): Promise<void> {
    try {
      const schemaContent = await readFile(this.schemaPath, "utf-8");
      const schema = JSON.parse(schemaContent);
      this.validateFn = this.ajv.compile(schema);
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load schema from ${this.schemaPath}`,
        {
          schemaPath: this.schemaPath,
          error: error instanceof Error ? error.message : error
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
        message: error.message || "Unknown error",
        path: error.instancePath || "/",
        keyword: error.keyword || "unknown",
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
      const configContent = await readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      const validation = await this.validate(config);
      if (!validation.valid) {
        throw new ConfigurationError(
          `Configuration validation failed`,
          {
            configPath,
            errors: validation.errors
          }
        );
      }

      return config as PromptunaConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error; // Re-throw configuration errors as-is
      }
      
      // Handle file reading and JSON parsing errors
      throw new ConfigurationError(
        `Failed to read or parse config file: ${configPath}`,
        {
          configPath,
          error: error instanceof Error ? error.message : error
        }
      );
    }
  }
}
