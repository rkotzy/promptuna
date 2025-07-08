export interface ChatCompletionParams {
  /** The ID of the prompt */
  promptId: string;
  /** Variables to interpolate into the template */
  variables?: Record<string, any>;
  /** Stable identifier used to hash into deterministic traffic buckets */
  userId?: string;
  /** Tags that describe the request context (e.g., geography, experiment flags) */
  tags?: string[];
  /** Unix timestamp (seconds) to evaluate phased roll-outs. Defaults to now. */
  unixTime?: number;
}

export interface GetTemplateParams {
  /** The ID of the prompt */
  promptId: string;
  /** The ID of the variant within the prompt */
  variantId: string;
  /** Variables to interpolate into the template */
  variables?: Record<string, any>;
}
