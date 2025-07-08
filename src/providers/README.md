# Providers Module

LLM provider implementations for OpenAI, Anthropic, and Google.

## Purpose

- Abstract different LLM APIs behind a common interface
- Handle provider-specific authentication and client initialization
- Transform message formats and handle structured responses
- Normalize errors and implement retry logic

## Files

- **`types.ts`** - Provider interface and common types (`Provider`, `ChatCompletionOptions`, `ChatMessage`)
- **`openai.ts`** - OpenAI provider implementation
- **`anthropic.ts`** - Anthropic provider implementation  
- **`google.ts`** - Google provider implementation
- **`index.ts`** - Public exports

## Key Features

- **Common interface** - All providers implement the same `Provider` interface
- **Dynamic loading** - Providers use dynamic imports for optional peer dependencies
- **Structured responses** - Each provider handles JSON Schema responses differently:
  - OpenAI: Native `response_format` with JSON Schema
  - Anthropic: Function calling with `input_schema`
  - Google: `responseSchema` with `responseMimeType`
- **Error normalization** - Consistent error classification across providers