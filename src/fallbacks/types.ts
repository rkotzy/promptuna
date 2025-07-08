import type { ProviderError } from '../errors';

export interface ExecutionTarget {
  providerId: string; // Key into config.providers
  providerType: string; // e.g. "openai", "anthropic", "google"
  model: string;
}

export interface FallbackCallbackContext {
  target: ExecutionTarget;
  error?: ProviderError;
}