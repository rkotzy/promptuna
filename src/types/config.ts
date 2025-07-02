export interface PromptunaConfig {
  version: string;
  providers: Record<string, any>;
  responseSchemas?: Record<string, any>;
  prompts: Record<string, any>;
}

export interface PromptunaRuntimeConfig {
  configPath: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
}

export interface Variant {
  provider: string;
  model: string;
  default?: boolean;
  parameters?: ModelParams;
  messages: Message[];
  responseFormat?: ResponseFormat;
  fallback?: FallbackTarget[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: {
    template: string;
  };
}

export interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  json_mode?: boolean;
  [key: string]: number | string | boolean | string[] | undefined;
}

export interface ResponseFormat {
  type: 'json_schema' | 'raw_text' | 'xml' | 'markdown';
  schemaRef?: string;
}

export interface FallbackTarget {
  provider: string;
  model: string;
}

export interface RenderedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Error types for better error handling
export class PromptunaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PromptunaError';
  }
}

export class ConfigurationError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

export class ExecutionError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, 'EXECUTION_ERROR', details);
  }
}

export class TemplateError extends PromptunaError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_ERROR', details);
  }
}
