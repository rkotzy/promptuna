# Promptuna Validation Package

Full configuration validation with AJV schema validation and structured output requirements.

## Purpose

This package provides comprehensive validation for Promptuna configurations, including:

- JSON Schema validation using AJV
- Structured output requirements (OpenAI compatibility)
- Recursive schema validation
- Detailed error messages for debugging

## Usage

### Development Environment

```typescript
import { Promptuna } from 'promptuna';
import { ConfigValidator } from 'promptuna/validate';

// Validate configuration first
const validator = new ConfigValidator();
await validator.validateAndLoadConfigFile('./config.json');

// Then use regular Promptuna
const promptuna = new Promptuna({
  configPath: './config.json',
  openaiApiKey: process.env.OPENAI_API_KEY,
});
```

### CI/CD Pipeline

```bash
# Install with validation dependencies
npm install promptuna

# Validate configuration
npx promptuna-validate config.json
```

### Programmatic Validation

```typescript
import { ConfigValidator } from 'promptuna/validate';

const validator = new ConfigValidator();
try {
  const config = await validator.validateAndLoadConfigFile('./config.json');
  console.log('✅ Configuration valid');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}
```

## CLI Tool

The validation package includes a CLI tool for standalone validation:

```bash
# Validate a configuration file
npx promptuna-validate config.json

# Output:
# ✅ Configuration valid
#    Version: 1.0.0
#    Prompts: 5
#    Providers: 3
#    Response schemas: 2
#    Validation time: 23ms
```

## Validation Rules

### Schema Validation

- **JSON Schema compliance** - All response schemas must be valid JSON Schema
- **Schema references** - All `schemaRef` values must exist in `responseSchemas`

### Structured Output Requirements

- **additionalProperties: false** - All object schemas must be strict
- **All fields required** - All object properties must be in `required` array
- **OpenAI compatibility** - Ensures schemas work with OpenAI's structured outputs

### Business Rules

- **Default variants** - Each prompt must have exactly one default variant
- **Provider references** - All provider references must exist
- **Required parameters** - Provider-specific required parameters must be present
- **Template validation** - All Liquid templates are validated for syntax errors and unknown filters

## Bundle Size

The validation package includes AJV dependencies and is approximately **~150KB**.

For production/edge environments, use the core `promptuna` package instead (~50KB).

## Error Messages

Validation errors include detailed context and suggestions:

```
❌ Validation failed
Schema "user-profile" requires additionalProperties: false for structured outputs

Details:
{
  "schemaId": "user-profile",
  "currentValue": undefined,
  "suggestion": "Add \"additionalProperties\": false to the object schema"
}
```

## Version Compatibility

The validation package uses the same version constants as the core package to ensure schema compatibility.

Supported schema versions: 1.0.0
