import { vi } from 'vitest';

/**
 * Temporarily overrides Date.now() within the callback scope.
 * Automatically restores the original implementation afterwards.
 */
export async function withNow<T>(
  timestampMs: number,
  fn: () => Promise<T> | T
): Promise<T> {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(timestampMs);
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
}

/**
 * Temporarily overrides Math.random() within the callback scope.
 * Automatically restores the original implementation afterwards.
 */
export async function withRandom<T>(
  randomValue: number,
  fn: () => Promise<T> | T
): Promise<T> {
  const spy = vi.spyOn(Math, 'random').mockReturnValue(randomValue);
  try {
    return await fn();
  } finally {
    spy.mockRestore();
  }
}
