import { randomUUID } from 'crypto';
import { PromptunaObservability, TokenUsage } from '../types/observability';
import { ObservabilityTimer } from './observabilityTimer';

interface BuilderInit {
  sdkVersion: string;
  environment?: 'dev' | 'prod';
  promptId: string;
  /** Variant may be unknown at construction time */
  variantId?: string;
  routingReason: PromptunaObservability['routingReason'];
  emit?: (evt: PromptunaObservability) => void;
}

/**
 * Convenience class for building and emitting `PromptunaObservability` records
 * with minimal boilerplate in the core SDK flow.
 */
export class ObservabilityBuilder {
  private readonly timer = new ObservabilityTimer();
  private readonly emit?: (evt: PromptunaObservability) => void;
  private readonly baseStatic: Omit<
    PromptunaObservability,
    | 'timings'
    | 'success'
    | 'error'
    | 'tokenUsage'
    | 'provider'
    | 'model'
    | 'providerRequestId'
    | 'fallbackUsed'
    | 'fallbacks'
    | 'variantId'
  >;

  // Mutable pieces that are filled as we progress through execution
  private provider?: string;
  private model?: string;
  private providerRequestId?: string;
  private tokenUsage?: TokenUsage;
  private variantId: string;

  constructor(init: BuilderInit) {
    this.emit = init.emit;

    this.baseStatic = {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      sdkVersion: init.sdkVersion,
      environment: init.environment,
      promptId: init.promptId,
      routingReason: init.routingReason,
    } as const;

    this.variantId = init.variantId ?? 'unknown';
  }

  /* ------------------------- stage markers ------------------------- */
  markTemplate(): void {
    this.timer.mark('template');
  }

  markProvider(): void {
    this.timer.mark('provider');
  }

  /* ------------------------- field setters ------------------------- */
  setProvider(type: string, model: string): void {
    this.provider = type;
    this.model = model;
  }

  setProviderRequestId(id: string): void {
    this.providerRequestId = id;
  }

  setTokenUsage(raw?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }): void {
    if (!raw) return;
    this.tokenUsage = {
      prompt: raw.prompt_tokens ?? 0,
      completion: raw.completion_tokens ?? 0,
      total: raw.total_tokens ?? 0,
    };
  }

  /** Update the variantId once it becomes known */
  setVariantId(id: string): void {
    this.variantId = id;
  }

  /* ------------------------- finalisation ------------------------- */
  buildSuccess(): PromptunaObservability {
    const event: PromptunaObservability = {
      ...this.baseStatic,
      provider: this.provider ?? 'unknown',
      model: this.model ?? 'unknown',
      providerRequestId: this.providerRequestId,
      timings: this.timer.end(),
      tokenUsage: this.tokenUsage,
      fallbackUsed: false,
      success: true,
      variantId: this.variantId,
    } as PromptunaObservability;

    this.emit?.(event);
    return event;
  }

  buildError(error: any): PromptunaObservability {
    const event: PromptunaObservability = {
      ...this.baseStatic,
      provider: this.provider ?? 'unknown',
      model: this.model ?? 'unknown',
      providerRequestId: this.providerRequestId,
      timings: this.timer.end(),
      fallbackUsed: false,
      success: false,
      error: {
        type: error?.constructor?.name ?? 'Error',
        message: error?.message ?? String(error),
        retryable: !!error?.retryable,
        provider: this.provider,
        code: error?.code,
        httpStatus: error?.status,
        stack: error?.stack,
      },
      variantId: this.variantId,
    } as PromptunaObservability;

    this.emit?.(event);
    return event;
  }
}
