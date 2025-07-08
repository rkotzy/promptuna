# Shared Module

Common utilities and foundational types used across the SDK.

## Purpose

- Provide foundational types used by multiple modules
- Implement parameter normalization for different providers
- Define provider capabilities and parameter mapping
- Share common utilities across the codebase

## Files

- **`types.ts`** - Foundational types (`ProviderId`, `MappingRule`)
- **`utils/`** - Shared utility functions and provider capabilities
  - **`providerCapabilities.ts`** - Parameter mapping table for all providers
  - **`normalizeParameters.ts`** - `buildProviderParams()` function for parameter transformation
- **`index.ts`** - Public exports

## Key Features

- **Provider abstraction** - Common `ProviderId` type for all supported providers
- **Parameter normalization** - Maps canonical parameters to provider-specific names
- **Capability matrix** - Defines which parameters each provider supports
- **Type safety** - Provides foundational types for cross-module usage

## Parameter Mapping

Transforms canonical parameters to provider-specific equivalents:
- `temperature` with different scales and ranges per provider
- `max_tokens` mapped to provider-specific parameter names
- Unsupported parameters automatically dropped per provider