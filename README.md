# Promptuna SDK

A TypeScript SDK for LLM prompt management with multi-provider support using a configuration-based approach.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, and Google LLMs through a unified interface
- **Configuration-Driven**: Define prompts, variants, and routing in JSON configuration files
- **Template Processing**: Liquid template engine for dynamic prompt generation
- **Type-Safe**: Full TypeScript support with proper type definitions
- **Secure**: API keys provided at runtime, never stored in configuration files
- **Lightweight**: Install only the provider SDKs you need

## Installation

### Core SDK

```bash
npm install promptuna
```

### Provider SDKs (Install as needed)

```bash
# For OpenAI support (GPT models)
npm install openai

# For Anthropic support (Claude models)
npm install @anthropic-ai/sdk

# For Google support (Gemini models)
npm install @google/generative-ai
```

### Supported Versions

Promptuna is tested with these provider SDK versions:
- `openai`: ^4.0.0
- `@anthropic-ai/sdk`: ^0.24.0
- `@google/generative-ai`: ^0.15.0

## Quick Start

### 1. Set Environment Variables

```bash
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_API_KEY="your-google-key"
```

### 2. Create Configuration File

```json
{
  "version": "1.0.0",
  "providers": {
    "openai-primary": {
      "type": "openai"
    },
    "anthropic-primary": {
      "type": "anthropic"
    }
  },
  "prompts": {
    "greeting": {
      "description": "Generate a friendly greeting",
      "variants": {
        "gpt4": {
          "provider": "openai-primary",
          "model": "gpt-4",
          "parameters": {
            "temperature": 0.7,
            "maxTokens": 100
          },
          "messages": [
            {
              "role": "system",
              "content": { "template": "You are a helpful assistant." }
            },
            {
              "role": "user",
              "content": { "template": "Say hello to {{name}}!" }
            }
          ]
        }
      },
      "routing": {
        "default": "gpt4"
      }
    }
  }
}
```

### 3. Use the SDK

```typescript
import { Promptuna } from 'promptuna';

async function main() {
  // Initialize with configuration and API keys
  const promptuna = new Promptuna({
    configPath: './config.json',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Generate a chat completion
    const response = await promptuna.chatCompletion(
      'greeting',        // Prompt ID
      'gpt4',           // Variant ID
      { name: 'Alice' }  // Template variables
    );

    console.log(response.choices[0].message.content);
    // Output: "Hello Alice! How can I help you today?"

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
```

## API Reference

### Constructor

```typescript
new Promptuna(config: PromptunaRuntimeConfig)
```

**PromptunaRuntimeConfig:**
- `configPath: string` - Path to your JSON configuration file
- `openaiApiKey?: string` - OpenAI API key (optional)
- `anthropicApiKey?: string` - Anthropic API key (optional)
- `googleApiKey?: string` - Google API key (optional)

### Methods

#### `chatCompletion(promptId, variantId, variables)`

Execute a chat completion using the specified prompt variant.

```typescript
const response = await promptuna.chatCompletion(
  'greeting',           // Prompt ID from config
  'gpt4',              // Variant ID from config  
  { name: 'Alice' }     // Variables for template interpolation
);
```

#### `getVariantTemplate(promptId, variantId, variables)`

Get rendered messages without making an API call (useful for testing templates).

```typescript
const messages = await promptuna.getVariantTemplate(
  'greeting',
  'gpt4', 
  { name: 'Alice' }
);
// Returns: [{ role: 'system', content: '...' }, { role: 'user', content: 'Say hello to Alice!' }]
```

#### `loadAndValidateConfig()`

Manually load and validate the configuration file.

```typescript
const config = await promptuna.loadAndValidateConfig();
console.log(`Loaded ${Object.keys(config.prompts).length} prompts`);
```

## Multi-Provider Example

```typescript
import { Promptuna } from 'promptuna';

const promptuna = new Promptuna({
  configPath: './config.json',
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
});

// Use different providers for the same prompt
const gptResponse = await promptuna.chatCompletion('summary', 'gpt4-variant', { text: 'Long text...' });
const claudeResponse = await promptuna.chatCompletion('summary', 'claude-variant', { text: 'Long text...' });
const geminiResponse = await promptuna.chatCompletion('summary', 'gemini-variant', { text: 'Long text...' });
```

## Configuration

### Provider Configuration

Define providers in your configuration file:

```json
{
  "providers": {
    "openai-primary": {
      "type": "openai"
    },
    "anthropic-backup": {
      "type": "anthropic"
    },
    "google-experimental": {
      "type": "google"
    }
  }
}
```

### Prompt Variants

Create multiple variants of the same prompt for different providers:

```json
{
  "prompts": {
    "translate": {
      "description": "Translate text to different languages",
      "variants": {
        "gpt4-translator": {
          "provider": "openai-primary",
          "model": "gpt-4",
          "parameters": {
            "temperature": 0.3,
            "maxTokens": 1000
          },
          "messages": [
            {
              "role": "user",
              "content": { "template": "Translate '{{text}}' to {{language}}" }
            }
          ]
        },
        "claude-translator": {
          "provider": "anthropic-backup",
          "model": "claude-3-opus-20240229",
          "parameters": {
            "temperature": 0.3,
            "maxTokens": 1000
          },
          "messages": [
            {
              "role": "user",
              "content": { "template": "Translate '{{text}}' to {{language}}" }
            }
          ]
        }
      },
      "routing": {
        "default": "gpt4-translator"
      }
    }
  }
}
```

## Template Variables

Promptuna uses the Liquid template engine for variable interpolation:

```json
{
  "role": "user",
  "content": {
    "template": "Hello {{name}}! Today is {{date | date: '%B %d, %Y'}}."
  }
}
```

```typescript
const response = await promptuna.chatCompletion('greeting', 'variant', {
  name: 'Alice',
  date: '2024-01-15'
});
```

## Error Handling

```typescript
try {
  const response = await promptuna.chatCompletion('prompt', 'variant', {});
} catch (error) {
  if (error.message.includes('API key not provided')) {
    console.log('Set your API keys as environment variables');
  } else if (error.message.includes('not installed')) {
    console.log('Install the required provider SDK');
  } else {
    console.error('Other error:', error.message);
  }
}
```

## Project Structure

```
promptuna/
├── src/
│   ├── index.ts                 # Main exports
│   ├── Promptuna.ts            # Core SDK class
│   ├── providers/
│   │   ├── types.ts            # Provider interfaces
│   │   ├── openai.ts           # OpenAI implementation
│   │   ├── anthropic.ts        # Anthropic implementation
│   │   └── google.ts           # Google implementation
│   ├── validators/
│   │   └── configValidator.ts  # Schema validation
│   ├── processors/
│   │   └── templateProcessor.ts # Template processing
│   └── types/
│       └── config.ts           # TypeScript types
├── schema.json                 # Configuration schema
├── promptuna-example.json      # Example configuration
└── example.ts                  # Usage example
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run dev

# Run the example
npx ts-node example.ts
```

## Troubleshooting

### Provider SDK Not Found

```
Error: OpenAI SDK not installed. Please run: npm install openai
```

**Solution:** Install the required provider SDK:
```bash
npm install openai  # or @anthropic-ai/sdk or @google/generative-ai
```

### API Key Not Provided

```
Error: OpenAI API key not provided in configuration
```

**Solution:** Set the API key as an environment variable or pass it to the constructor:
```bash
export OPENAI_API_KEY="your-key"
```

### Version Compatibility

If you see peer dependency warnings, make sure you're using compatible provider SDK versions:

- OpenAI: ^4.0.0
- Anthropic: ^0.24.0  
- Google: ^0.15.0

## License

MIT