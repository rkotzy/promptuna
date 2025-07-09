# Config Module

Configuration management, validation, and core SDK types.

## Purpose

- Load and validate configuration files against JSON Schema
- Define core types for prompts, variants, and SDK configuration
- Provide type-safe interfaces for SDK API methods
- Manage runtime configuration (API keys, environment settings)
- Validate template syntax during configuration loading

## Files

- **`types.ts`** - Core configuration types (`PromptunaConfig`, `Variant`, `Prompt`, API parameter types)
- **`validator.ts`** - Configuration validation using AJV JSON Schema
- **`index.ts`** - Public exports

## Key Types

- `PromptunaConfig` - Main configuration file structure
- `PromptunaRuntimeConfig` - Runtime settings (API keys, environment)
- `ChatCompletionParams` / `GetTemplateParams` - SDK API interfaces
- `Variant` - Prompt variant with provider, model, and parameters
- `Prompt` - Collection of variants with routing rules