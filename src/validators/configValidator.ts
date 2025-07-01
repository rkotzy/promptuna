import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { PromptunaConfig } from "../types/config";

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
      throw new Error(
        `Failed to load schema from ${this.schemaPath}: ${error}`
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
        const errorDetails =
          validation.errors
            ?.map((err) => `${err.path}: ${err.message}`)
            .join(", ") || "Unknown validation errors";
        throw new Error(`Invalid configuration: ${errorDetails}`);
      }

      return config as PromptunaConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw validation errors as-is
      }
      throw new Error(`Failed to read or parse config file: ${error}`);
    }
  }
}
