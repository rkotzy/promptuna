import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto.randomUUID to deterministic value
vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-fixed',
}));

// Mock ObservabilityTimer to deterministic implementation
vi.mock('../../../src/observability/timer', () => {
  return {
    ObservabilityTimer: class {
      private marks: Record<string, number> = {};
      mark(label: string) {
        this.marks[label] = 10; // arbitrary fixed value per stage
      }
      end() {
        // total 100ms plus each mark value
        return { total: 100, ...this.marks } as any;
      }
    },
  };
});

import { ObservabilityBuilder } from '../../../src/observability/builder';

const init = {
  sdkVersion: '1.0.0',
  environment: 'dev' as const,
  promptId: 'greeting',
  userId: 'user123',
  variantId: 'v_default',
  routingReason: 'weight-distribution' as const,
} as const;

describe('ObservabilityBuilder', () => {
  let builder: ObservabilityBuilder;
  let emitSpy: any;

  beforeEach(() => {
    emitSpy = vi.fn();
    builder = new ObservabilityBuilder({ ...init, emit: emitSpy });
  });

  it('buildSuccess returns populated event & calls emit', () => {
    builder.markTemplate();
    builder.setProvider('openai', 'gpt-4');
    builder.setProviderRequestId('resp1');
    builder.setTokenUsage({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
    builder.addFallbackAttempt({
      provider: 'openai',
      model: 'gpt-4',
      reason: 'timeout',
    });

    const evt = builder.buildSuccess();

    expect(evt.success).toBe(true);
    expect(evt.requestId).toBe('uuid-fixed');
    expect(evt.provider).toBe('openai');
    expect(evt.timings.total).toBe(100);
    expect(evt.timings.template).toBe(10);
    expect(evt.fallbackUsed).toBe(true);
    expect(evt.tokenUsage?.total).toBe(15);
    expect(emitSpy).toHaveBeenCalledWith(evt);
  });

  it('buildError captures error details', () => {
    const error = new Error('boom');
    const evt = builder.buildError(error);
    expect(evt.success).toBe(false);
    expect(evt.error?.message).toBe('boom');
    expect(evt.timings.total).toBe(100);
    expect(emitSpy).toHaveBeenCalledWith(evt);
  });
});
