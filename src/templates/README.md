# Templates Module

Template processing and message rendering using Liquid templating.

## Purpose

- Process Liquid templates with variable interpolation
- Transform raw message templates into rendered content
- Provide custom filters for prompt-specific operations
- Handle template errors with detailed context

## Files

- **`types.ts`** - Template types (`Message`, `RenderedMessage`, `TemplateError`)
- **`processor.ts`** - `TemplateProcessor` class with Liquid template processing
- **`filters.ts`** - Shared custom filters and error suggestion utilities
- **`index.ts`** - Public exports

## Key Features

- **Liquid templating** - Full LiquidJS support with variables, filters, and control flow
- **Custom filters** - Prompt-specific filters like `join`, `numbered`, `default`, `capitalize`
- **Template pre-compilation** - Templates are parsed and cached for performance
- **Configuration-time validation** - Template syntax errors are caught during config loading
- **Shared filter registry** - Consistent custom filters across validation and production
- **Error handling** - Detailed error messages with template and variable context
- **Message transformation** - Converts template messages to rendered content ready for LLMs

## Template Structure

Raw messages contain Liquid templates:
```json
{
  "role": "user",
  "content": {
    "template": "Hello {{name}}! You have {{count}} items."
  }
}
```

Rendered messages contain interpolated content:
```json
{
  "role": "user", 
  "content": "Hello Alice! You have 3 items."
}
```