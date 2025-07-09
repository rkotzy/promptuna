export type ProviderId = 'openai' | 'anthropic' | 'google';

/**
 * Mapping rules for a single parameter for a specific provider.
 * - `param`   : name that the provider SDK expects
 * - `min`/`max`: optional clamp range (after any scale)
 * - `scale`   : optional transform applied to the canonical value before clamping
 * If the value is `false`, the parameter is not supported for that provider.
 */
export type MappingRule =
  | {
      param: string;
      min?: number;
      max?: number;
      scale?: (v: any) => any;
    }
  | false;
