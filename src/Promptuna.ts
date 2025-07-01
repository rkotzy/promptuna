import { resolve } from "path";
import { ConfigValidator } from "./validators/configValidator";
import { PromptunaConfig } from "./types/config";

export class Promptuna {
  private configPath: string;
  private validator: ConfigValidator;
  private config: PromptunaConfig | null = null;
  private configPromise: Promise<PromptunaConfig> | null = null;

  constructor(configPath: string) {
    this.configPath = resolve(configPath);
    this.validator = new ConfigValidator();
  }

  /**
   * Loads and validates the configuration file against the Promptuna schema
   * Always re-reads the file and updates the internal cache
   * @returns The validated configuration object
   * @throws Error if the configuration is invalid or cannot be loaded
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
   * @throws Error if the configuration is invalid or cannot be loaded
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
}
