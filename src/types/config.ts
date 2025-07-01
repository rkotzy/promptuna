export interface PromptunaConfig {
  version: string;
  providers: Record<string, Provider>;
  responseSchemas?: Record<string, JsonSchema>;
  prompts: Record<string, any>;
}

export interface Provider {
  type: string;
  config?: Record<string, any>;
}

export interface JsonSchema {
  [key: string]: any;
}