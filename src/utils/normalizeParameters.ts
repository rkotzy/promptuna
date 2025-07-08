import {
  ProviderCapabilities,
  ProviderId,
  MappingRule,
} from '../providers/providerCapabilities';

/**
 * Convert the canonical variant.parameters object into the provider-specific
 * parameter set expected by the concrete SDK.
 */
export function buildProviderParams(
  providerType: ProviderId,
  canonical: Record<string, any> = {}
): Record<string, any> {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(canonical)) {
    const rule: MappingRule | undefined = (ProviderCapabilities as any)[key]?.[
      providerType
    ];
    if (rule === undefined) {
      // Unknown parameter – ignore for now
      continue;
    }
    if (rule === false) {
      // Explicitly unsupported by this provider – drop
      continue;
    }

    // Clone to avoid mutation when we type-narrow to MappingRule object
    const { param, min, max, scale } = rule as Exclude<MappingRule, false>;

    let v: any = value;
    if (scale) v = scale(v);
    if (typeof v === 'number') {
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
    }

    out[param] = v;
  }

  return out;
}
