import { describe, it, expect, vi } from 'vitest';

import { executeWithFallback } from '../../../src/fallbacks/executor';
import { ProviderError } from '../../../src/errors';
import type { ExecutionTarget } from '../../../src/fallbacks/types';

// Simple noop provider object – executor doesn\'t use any provider methods itself
const stubProvider = {} as any;

const getProvider = vi.fn(() => stubProvider);

const primary: ExecutionTarget = {
  providerId: 'p1',
  providerType: 'openai',
  model: 'gpt-4',
};
const secondary: ExecutionTarget = {
  providerId: 'p2',
  providerType: 'anthropic',
  model: 'claude',
};

describe('executeWithFallback', () => {
  it('returns result on first successful attempt', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');

    const res = await executeWithFallback(
      [primary, secondary],
      attempt,
      getProvider
    );

    expect(res).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith(stubProvider, primary);
  });

  it('falls back after retryable ProviderError and succeeds on second', async () => {
    const retryError = new ProviderError('timeout', 'timeout', true);
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(retryError)
      .mockResolvedValueOnce('second_ok');

    const res = await executeWithFallback(
      [primary, secondary],
      attempt,
      getProvider
    );

    expect(res).toBe('second_ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('propagates non-retryable ProviderError from first attempt without trying fallbacks', async () => {
    const fatalError = new ProviderError('provider-error', 'fatal', false);
    const attempt = vi.fn().mockRejectedValue(fatalError);

    await expect(
      executeWithFallback([primary, secondary], attempt, getProvider)
    ).rejects.toBe(fatalError);

    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('throws last retryable error if all attempts fail', async () => {
    const e1 = new ProviderError('timeout', 't1', true);
    const e2 = new ProviderError('rate-limit', 't2', true);

    const attempt = vi.fn().mockRejectedValueOnce(e1).mockRejectedValueOnce(e2);

    await expect(
      executeWithFallback([primary, secondary], attempt, getProvider)
    ).rejects.toBe(e2);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('invokes onAttempt callback with correct context', async () => {
    const retryError = new ProviderError('timeout', 't', true);
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(retryError)
      .mockResolvedValueOnce('done');

    const cb = vi.fn();

    await executeWithFallback([primary, secondary], attempt, getProvider, cb);

    // first call: error
    expect(cb).toHaveBeenNthCalledWith(1, {
      target: primary,
      error: retryError,
    });
    // second call: success (no error prop)
    expect(cb).toHaveBeenNthCalledWith(2, { target: secondary });
  });
});
