export interface ChatInvokeOptions {
  /** Stable identifier used to hash into deterministic traffic buckets */
  userId?: string;
  /** Tags that describe the request context (e.g., geography, experiment flags) */
  tags?: string[];
  /** Unix timestamp (seconds) to evaluate phased roll-outs. Defaults to now. */
  unixTime?: number;
}
