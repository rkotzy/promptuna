export type FallbackReason = 'provider-error' | 'timeout' | 'rate-limit';

/**
 * Normalised error thrown by provider wrappers so the core SDK can treat them uniformly.
 * `retryable` indicates whether the operation may succeed if attempted again (e.g. with a different provider).
 */
export class ProviderError extends Error {
  public readonly reason: FallbackReason;
  public readonly retryable: boolean;
  public readonly code?: string;
  public readonly httpStatus?: number;

  constructor(
    reason: FallbackReason,
    message: string,
    retryable = false,
    code?: string,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'ProviderError';
    this.reason = reason;
    this.retryable = retryable;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
