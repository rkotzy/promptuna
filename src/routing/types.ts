import type { Variant, Prompt } from '../config/types';
import type { RoutingReason } from '../observability/types';

export interface VariantSelection {
  variantId: string;
  variant: Variant;
  reason: RoutingReason;
  weightPicked?: number;
}

export interface VariantSelectorParams {
  prompt: Prompt;
  promptId: string;
  userId?: string;
  tags?: string[];
  /** Unix timestamp in seconds */
  now?: number;
}

export interface RoutingRule {
  target: string;
  weight?: number;
  tags?: string[];
}

export interface PhasedRule {
  start: number;
  end?: number;
  weights: Record<string, number>;
}

export interface Routing {
  rules: RoutingRule[];
  phased?: PhasedRule[];
}
