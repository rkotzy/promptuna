# Routing Module

Variant selection and A/B testing logic for intelligent prompt routing.

## Purpose

- Implement sophisticated variant selection based on user context
- Support tag-based routing, weighted distribution, and phased rollouts
- Provide deterministic selection for consistent user experience
- Track routing decisions for analytics and experimentation

## Files

- **`types.ts`** - Routing types (`VariantSelection`, `RoutingRule`, `PhasedRule`, `Routing`)
- **`selector.ts`** - Core variant selection logic with `selectVariant()` function
- **`index.ts`** - Public exports

## Routing Priority

1. **Tag-based rules** - Route based on user tags (geography, features, etc.)
2. **Phased rollouts** - Time-based gradual rollouts
3. **Weight distribution** - General A/B testing without user segmentation
4. **Default fallback** - Variant marked with `"default": true`

## Key Features

- **Deterministic selection** - Uses SHA-256 hash of `userId:promptId:salt` for consistency
- **Multiple routing strategies** - Tags, weights, and time-based phasing
- **Routing reasons** - Tracks why each variant was selected for analytics
- **Experiment context** - Captures A/B testing metadata for analysis