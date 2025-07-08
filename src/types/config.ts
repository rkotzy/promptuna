export interface PromptunaConfig {
  version: string;
  providers: Record<string, ProviderConfig>;
  responseSchemas?: Record<string, any>;
  prompts: Record<string, Prompt>;
}

export interface PromptunaRuntimeConfig {
  configPath: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  environment?: 'dev' | 'prod';
  onObservability?: (
    event: import('./observability').PromptunaObservability
  ) => void;
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
  top_k?: number;
  candidate_count?: number;
  logit_bias?: Record<string, number>;
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

// ---------------------- Routing & Prompt ----------------------

export interface RoutingRule {
  target: string;
  weight?: number;
  tags?: string[];
}

export interface PhasedRule {
  start: number;
  end?: number;
  weights: Record<string, number>;
}

export interface Routing {
  rules: RoutingRule[];
  phased?: PhasedRule[];
}

export interface Prompt {
  description: string;
  variants: Record<string, Variant>;
  routing: Routing;
  chains?: any[]; // loosely typed for now
}

export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'google';
  config?: Record<string, any>; // provider-specific additional config
}
