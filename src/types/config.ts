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

export interface RenderedMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
}

// Error types for better error handling
export class PromptunaError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "PromptunaError";
  }
}

export class ConfigurationError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, "CONFIGURATION_ERROR", details);
  }
}

export class ExecutionError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, "EXECUTION_ERROR", details);
  }
}

export class TemplateError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, "TEMPLATE_ERROR", details);
  }
}
