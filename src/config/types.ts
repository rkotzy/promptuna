import type { PromptunaObservability } from '../observability/types';
import type { Message } from '../templates/types';
import type { ResponseFormat, FallbackTarget, ModelParams } from '../responses/types';
import type { Routing } from '../routing/types';
import type { ChatMessage } from '../providers/types';

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
  onObservability?: (event: PromptunaObservability) => void;
}

export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'google';
  config?: Record<string, any>; // provider-specific additional config
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

export interface Prompt {
  description: string;
  variants: Record<string, Variant>;
  routing: Routing;
  chains?: any[]; // loosely typed for now
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    message: string;
    path: string;
    keyword: string;
  }>;
}

// Error types
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

export class ExecutionError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

// SDK API parameter types
export interface ChatCompletionParams {
  /** The ID of the prompt */
  promptId: string;
  /** Variables to interpolate into the template */
  variables?: Record<string, any>;
  /** Conversation history to prepend to the prompt (e.g., previous messages) */
  messageHistory?: ChatMessage[];
  /** Stable identifier used to hash into deterministic traffic buckets */
  userId?: string;
  /** Tags that describe the request context (e.g., geography, experiment flags) */
  tags?: string[];
  /** Unix timestamp (seconds) to evaluate phased roll-outs. Defaults to now. */
  unixTime?: number;
}

export interface GetTemplateParams {
  /** The ID of the prompt */
  promptId: string;
  /** The ID of the variant within the prompt */
  variantId: string;
  /** Variables to interpolate into the template */
  variables?: Record<string, any>;
}