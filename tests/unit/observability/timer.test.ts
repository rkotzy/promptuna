import { describe, it, expect, vi } from 'vitest';
import { ObservabilityTimer } from '../../../src/observability/timer';

describe('ObservabilityTimer', () => {
  it('records marks and calculates durations', () => {
    // Mock performance.now to deterministic values: start=100, mark=150, end=400
    const spy = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100) // constructor
      .mockReturnValueOnce(150) // mark
      .mockReturnValueOnce(400); // end

    const timer = new ObservabilityTimer();

    timer.mark('template');
    const timings = timer.end();

    expect(timings.total).toBe(300);
    expect(timings.template).toBe(50);

    spy.mockRestore();
  });
});
