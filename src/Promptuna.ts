import { resolve } from "path";
import { ConfigValidator } from "./validators/configValidator";
import { PromptunaConfig } from "./types/config";

export class Promptuna {
  private configPath: string;
  private validator: ConfigValidator;
  private config: PromptunaConfig | null = null;

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
}
