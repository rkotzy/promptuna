# Responses Module

Response format definitions and model parameter types for structured LLM outputs.

## Purpose

- Define response format specifications (JSON Schema, raw text)
- Provide standard model parameter types across providers
- Define fallback target structures for error recovery
- Share response-related types across provider implementations

## Files

- **`types.ts`** - Response types (`ResponseFormat`, `ModelParams`, `FallbackTarget`)
- **`index.ts`** - Public exports

## Key Types

- **`ResponseFormat`** - Specifies how LLM should format responses (`json_schema` or `raw_text`)
- **`ModelParams`** - Standard parameters like `temperature`, `max_tokens`, `top_p`
- **`FallbackTarget`** - Provider/model combinations for fallback chains

## Response Formats

- **JSON Schema** - Structured outputs validated against JSON Schema via `schemaRef`
- **Raw Text** - Standard unstructured text responses

## Parameter Mapping

Canonical parameter names are automatically mapped to provider-specific equivalents:
- `max_tokens` → OpenAI: `max_completion_tokens`, Anthropic: `max_tokens`, Google: `maxOutputTokens`
- `top_p` → OpenAI: `top_p`, Anthropic: `top_p`, Google: `topP`