import { Provider } from '../providers/types';
import { ProviderError } from '../errors';

export interface ExecutionTarget {
  providerId: string; // Key into config.providers
  providerType: string; // e.g. "openai", "anthropic", "google"
  model: string;
}

export interface FallbackCallbackContext {
  target: ExecutionTarget;
  error?: ProviderError;
}

/**
 * Execute a chat completion (or any provider operation) against a list of targets.
 * The first target is the primary one; subsequent targets are fallbacks.
 *
 * @param targets Ordered list of provider/model pairs to try
 * @param attempt Function that performs the call given a provider instance and model name
 * @param getProvider Function that returns a provider instance for a given provider type
 * @param onAttempt Optional hook invoked after each attempt (success or failure)
 * @returns Result of the first successful attempt
 * @throws The last ProviderError if all attempts fail, or the original error for non-retryable failures
 */
export async function executeWithFallback<T>(
  targets: ExecutionTarget[],
  attempt: (provider: Provider, target: ExecutionTarget) => Promise<T>,
  getProvider: (providerType: string) => Provider,
  onAttempt?: (ctx: FallbackCallbackContext) => void
): Promise<T> {
  let lastError: ProviderError | undefined;

  for (const target of targets) {
    const provider = getProvider(target.providerType);

    try {
      const result = await attempt(provider, target);
      // Success – notify callback without error and exit
      onAttempt?.({ target });
      return result;
    } catch (err) {
      if (err instanceof ProviderError) {
        onAttempt?.({ target, error: err });
        if (!err.retryable) {
          // Non-retryable – propagate immediately
          throw err;
        }
        lastError = err; // store to throw later if all retries fail
        continue; // try next target if available
      }
      // Unknown error type – rethrow
      throw err;
    }
  }

  // All attempts exhausted
  if (lastError) throw lastError;
  throw new Error('Execution failed and no provider error captured.');
}
