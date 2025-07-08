import { performance } from 'node:perf_hooks';
import type { Timings } from './types';

/**
 * Simple helper for recording stage durations. Create once at the start of an operation,
 * call {@link mark} when a stage completes, then {@link end} to receive a `Timings`
 * object ready to drop into the `PromptunaObservability` record.
 */
export class ObservabilityTimer {
  private readonly start: number;
  private readonly marks: Record<string, number> = {};

  constructor() {
    this.start = performance.now();
  }

  /** Record the elapsed time for a stage */
  mark(label: string): void {
    this.marks[label] = performance.now() - this.start;
  }

  /** Finish timing and return aggregated durations */
  end(): Timings {
    const total = performance.now() - this.start;
    return { total, ...this.marks } as Timings;
  }
}
