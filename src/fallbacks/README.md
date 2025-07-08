# Fallbacks Module

Fallback execution logic for automatic error recovery and provider redundancy.

## Purpose

- Implement automatic retry logic with multiple provider/model combinations
- Classify errors for retry decisions (retryable vs non-retryable)
- Track fallback attempts for observability and monitoring
- Provide graceful degradation when primary providers fail

## Files

- **`types.ts`** - Fallback types (`ExecutionTarget`, `FallbackCallbackContext`)
- **`executor.ts`** - `executeWithFallback()` function with retry logic
- **`index.ts`** - Public exports

## Key Features

- **Ordered execution** - Attempts providers in configured order until one succeeds
- **Error classification** - Distinguishes retryable errors (rate limits, timeouts) from permanent failures
- **Observability hooks** - Callback system for tracking attempt results
- **Graceful degradation** - Falls back through provider chain automatically

## Execution Flow

1. **Primary attempt** - Try the main variant's provider/model
2. **Error evaluation** - Classify error as retryable or permanent
3. **Fallback attempts** - Try each fallback target in order
4. **Final result** - Return first success or throw last error

## Error Types

- **Retryable**: Rate limits (429), timeouts (408/504), service unavailable (503)
- **Non-retryable**: Authentication (401/403), bad requests (400), not found (404)