import { createHash } from 'crypto';
import { Variant, Prompt } from '../config/types';
import type { VariantSelection, VariantSelectorParams, RoutingRule, PhasedRule } from './types';

/** Deterministic pseudo-random in [0,1). */
function deterministicRandom(
  userId: string | undefined,
  promptId: string,
  salt: string
): number {
  if (!userId) return Math.random();
  const hex = createHash('sha256')
    .update(`${userId}:${promptId}:${salt}`)
    .digest('hex')
    .slice(0, 8);
  return parseInt(hex, 16) / 0xffffffff;
}

function pickWeighted(
  weights: Record<string, number>,
  rand: number
): { key: string; weight: number } {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let threshold = rand * total;
  for (const [key, w] of entries) {
    threshold -= w;
    if (threshold < 0) return { key, weight: w };
  }
  return { key: entries[0][0], weight: entries[0][1] };
}

function validateAndGetVariant(
  variants: Record<string, Variant>,
  variantId: string,
  promptId: string
): Variant {
  const variant = variants[variantId];
  if (!variant) {
    throw new Error(
      `Variant '${variantId}' not found in prompt '${promptId}'. Available variants: ${Object.keys(variants).join(', ')}`
    );
  }
  return variant;
}

export function selectVariant(
  params: VariantSelectorParams
): VariantSelection {
  const { prompt, promptId, userId, tags = [], now = Math.floor(Date.now() / 1000) } = params;
  const routing = prompt.routing ?? {};
  const rules: RoutingRule[] = routing.rules ?? [];

  /* ---------------- tag-based rules ---------------- */
  const tagRules = rules.filter(
    (r: RoutingRule) =>
      Array.isArray(r.tags) && r.tags.some((t: string) => tags.includes(t))
  );
  if (tagRules.length) {
    const weightMap: Record<string, number> = {};
    for (const r of tagRules) weightMap[r.target] = r.weight ?? 100;
    const rand = deterministicRandom(userId, promptId, 'tag');
    const { key, weight } = pickWeighted(weightMap, rand);
    return {
      variantId: key,
      variant: validateAndGetVariant(prompt.variants, key, promptId),
      reason: 'tag-match',
      weightPicked: weight,
    };
  }

  /* ---------------- phased roll-outs --------------- */
  const phases: PhasedRule[] = routing.phased ?? [];
  const currentPhase = phases
    .filter(p => p.start <= now && (p.end === undefined || now <= p.end))
    .sort((a, b) => b.start - a.start)[0];
  if (currentPhase) {
    const rand = deterministicRandom(userId, promptId, 'phase');
    const { key, weight } = pickWeighted(currentPhase.weights, rand);
    return {
      variantId: key,
      variant: validateAndGetVariant(prompt.variants, key, promptId),
      reason: 'phased-rollout',
      weightPicked: weight,
    };
  }

  /* -------------- weight distribution -------------- */
  const defaultRules = rules.filter(
    (r: RoutingRule) => !r.tags || r.tags.length === 0
  );
  if (defaultRules.length) {
    const weightMap: Record<string, number> = {};
    for (const r of defaultRules) weightMap[r.target] = r.weight ?? 100;
    const rand = deterministicRandom(userId, promptId, 'weight');
    const { key, weight } = pickWeighted(weightMap, rand);
    return {
      variantId: key,
      variant: validateAndGetVariant(prompt.variants, key, promptId),
      reason: 'weight-distribution',
      weightPicked: weight,
    };
  }

  /* --------------------- hard default -------------- */
  const entry = Object.entries(prompt.variants || {}).find(
    ([, v]: [string, Variant]) => v.default === true
  );
  if (!entry) {
    throw new Error(`No default variant found for prompt '${promptId}'.`);
  }
  const [key, variant] = entry as [string, Variant];
  return { variantId: key, variant, reason: 'default' };
}
