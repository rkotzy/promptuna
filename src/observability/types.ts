export interface PromptunaObservability {
  // Request identification
  requestId: string;
  /** Stable identifier for the end-user making the request */
  userId?: string;
  /** ISO-8601 timestamp in UTC */
  timestamp: string;
  /** Version of the Promptuna SDK (e.g. read from package.json) */
  sdkVersion: string;
  /** Runtime environment – useful when the same service is deployed to multiple envs */
  environment?: 'dev' | 'prod';

  // Prompt and variant selection
  promptId: string;
  /** The concrete variant executed – renamed from selectedVariant */
  variantId: string;
  routingReason: RoutingReason;
  routingTags?: string[];

  // Performance metrics
  timings: {
    /** End-to-end duration (ms) */
    total: number;
    /** Time spent rendering templates (ms) */
    template?: number;
    /** Time spent waiting for the LLM provider (ms) */
    provider?: number;
    /** Number of automatic retries that occurred */
    retries?: number;
  };
  tokenUsage?: TokenUsage;

  // Provider information
  provider: string;
  model: string;
  /** Provider-side request / response identifier for easier cross-referencing */
  providerRequestId?: string;

  // Fallback tracking
  fallbackUsed: boolean;
  /** Full chain of fallback attempts – first element is the initial attempt when fallbackUsed is true */
  fallbacks?: Array<{
    provider: string;
    model: string;
    reason: 'provider-error' | 'timeout' | 'rate-limit';
  }>;

  // Request outcome
  success: boolean;
  error?: ObservabilityError;

  // A/B testing context
  experimentContext?: {
    tags: string[];
    weightedSelection: boolean;
    selectedWeight: number;
  };

  // Phased rollout context
  phasedRolloutContext?: {
    phase: string;
    rolloutPercentage: number;
    rolloutStart: number;
    rolloutEnd?: number;
  };

  /** Free-form bucket for application-specific metadata */
  custom?: Record<string, any>;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ObservabilityError {
  type: string;
  message: string;
  code?: string;
  retryable: boolean;
  provider?: string;
  httpStatus?: number;
  stack?: string;
}

export type RoutingReason =
  | 'tag-match'
  | 'phased-rollout'
  | 'weight-distribution'
  | 'default';

export interface Timings {
  /** End-to-end duration – automatically filled */
  total: number;
  /** Time spent rendering Liquid templates */
  template?: number;
  /** Time spent waiting for provider response */
  provider?: number;
  /** Number of retries that occurred */
  retries?: number;
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key: string]: number | undefined;
}

export interface BuilderInit {
  sdkVersion: string;
  environment?: 'dev' | 'prod';
  promptId: string;
  userId?: string;
  /** Variant may be unknown at construction time */
  variantId?: string;
  routingReason: PromptunaObservability['routingReason'];
  /** Tags that influenced routing (if any) */
  routingTags?: string[];
  /** Experiment context for weighted selection */
  experimentContext?: PromptunaObservability['experimentContext'];
  emit?: (evt: PromptunaObservability) => void;
}
