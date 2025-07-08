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

/**
 * ProviderCapabilities lists **canonical** parameter names and how each
 * provider expects to receive that setting.  If a provider entry is `false`
 * the parameter will be dropped for that provider.
 */
export const ProviderCapabilities: Record<
  string,
  Partial<Record<ProviderId, MappingRule>>
> = {
  // ---------------------- core params ----------------------
  temperature: {
    // OpenAI allows 0-2, canonical is 0-1  ⇒ scale ×2
    openai: {
      param: 'temperature',
      min: 0,
      max: 2,
      scale: (v: number) => v * 2,
    },
    anthropic: { param: 'temperature', min: 0, max: 1 },
    google: {
      param: 'temperature',
      min: 0,
      max: 2,
      scale: (v: number) => v * 2,
    },
  },
  max_tokens: {
    openai: { param: 'max_completion_tokens' },
    anthropic: { param: 'max_tokens' },
    google: { param: 'maxOutputTokens' },
  },
  top_p: {
    openai: { param: 'top_p' },
    anthropic: { param: 'top_p' },
    google: { param: 'topP' },
  },
  frequency_penalty: {
    openai: { param: 'frequency_penalty', min: -2, max: 2 },
    anthropic: false,
    google: { param: 'frequencyPenalty', min: -2, max: 2 },
  },
  presence_penalty: {
    openai: { param: 'presence_penalty', min: -2, max: 2 },
    anthropic: false,
    google: { param: 'presencePenalty', min: -2, max: 2 },
  },
  stop: {
    openai: { param: 'stop' },
    anthropic: { param: 'stop_sequences' },
    google: { param: 'stopSequences' },
  },
  logit_bias: {
    openai: { param: 'logit_bias' },
    anthropic: false,
    google: false,
  },
};
