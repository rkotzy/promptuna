# Promptuna SDK

A TypeScript SDK for LLM prompt management with multi-provider support using a configuration-based approach.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, and Google LLMs through a unified interface
- **Configuration-Driven**: Define prompts, variants, and routing in JSON configuration files
- **Template Processing**: Liquid template engine for dynamic prompt generation
- **Type-Safe**: Full TypeScript support with proper type definitions
- **Secure**: API keys provided at runtime, never stored in configuration files
- **Lightweight**: Install only the provider SDKs you need
- **Observability Hook**: Capture rich telemetry for every request via a simple callback

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
npm install @google/genai
```

### Supported Versions

Promptuna is tested with these provider SDK versions:

- `openai`: ^5.8.2
- `@anthropic-ai/sdk`: ^0.56.0
- `@google/genai`: ^1.8.0

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
    googleApiKey: process.env.GOOGLE_API_KEY,
    onObservability: console.log,
  });

  try {
    // Generate a chat completion
    const response = await promptuna.chatCompletion({
      promptId: 'greeting',
      variables: { name: 'Alice' },
      userId: 'alice123',
      tags: ['US']
    });

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
- `onObservability?: (event: PromptunaObservability) => void` – Callback invoked with telemetry for each call

### Methods

#### `chatCompletion(params)`

Execute a chat completion using the specified prompt variant.

```typescript
const response = await promptuna.chatCompletion({
  promptId: 'greeting',
  variables: { name: 'Alice' },
  userId: 'alice123'
});

// With conversation history
const response = await promptuna.chatCompletion({
  promptId: 'follow-up',
  variables: { topic: 'weather' },
  messageHistory: [
    { role: 'user', content: 'Hello, how are you?' },
    { role: 'assistant', content: 'I am doing well, thank you!' }
  ],
  userId: 'alice123'
});
```

#### `getTemplate(params)`

Get rendered messages without making an API call (useful for testing templates).

```typescript
const messages = await promptuna.getTemplate({
  promptId: 'greeting',
  variantId: 'gpt4',
  variables: { name: 'Alice' }
});
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
  onObservability: console.log,
});

// Use different providers for the same prompt
const gptResponse = await promptuna.chatCompletion({
  promptId: 'summary',
  variables: { text: 'Long text...' }
});

// The provider will be selected via routing rules
const claudeResponse = await promptuna.chatCompletion({
  promptId: 'summary',
  variables: { text: 'Long text...' }
});
const geminiResponse = await promptuna.chatCompletion({
  promptId: 'summary',
  variables: { text: 'Long text...' }
});
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
const response = await promptuna.chatCompletion({
  promptId: 'greeting',
  variables: {
    name: 'Alice',
    date: '2024-01-15',
  }
});
```

## Error Handling

```typescript
try {
  const response = await promptuna.chatCompletion({
  promptId: 'prompt',
  variables: {}
});
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
npx tsx --env-file=.env example.ts
```

## Troubleshooting

### Provider SDK Not Found

```
Error: OpenAI SDK not installed. Please run: npm install openai
```

**Solution:** Install the required provider SDK:

```bash
npm install openai  # or @anthropic-ai/sdk or @google/genai
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

- OpenAI: ^5.8.2
- Anthropic: ^0.56.0
- Google: ^1.8.0

## License

MIT

## Routing Rules with Weights & Tags

Promptuna supports sophisticated routing logic out of the box. The snippet below shows how you can combine **tag-based rules**, **weight distributions**, and **phased rollouts** in a single prompt:

```jsonc
"routing": {
  "rules": [
    { "tags": ["US"],   "weight": 70, "target": "v_us" },   // Tag based
    { "tags": ["beta"], "weight": 30, "target": "v_beta" }, // Tag based

    { "weight": 60, "target": "v_default" }, // Weight distribution (no tags)
    { "weight": 40, "target": "v_beta" }     // Weight distribution (no tags)
  ],
  "phased": [
    {
      "start": 1751328000,
      "end":   1752537600,
      "weights": { "v_us": 50, "v_default": 50 }
    },
    {
      "start": 1752537600,
      "weights": { "v_us": 100, "v_default": 0 }
    }
  ]
}
```

- **Tag-based rules** take priority. If multiple tag rules match, the given weights decide the split.
- If no tag rules match, **weight distribution** rules are applied.
- If `phased` entries are present and the current time falls inside a phase window, those weights override everything else.
- Finally, if no rule applies, the SDK falls back to the variant marked with `"default": true`.

When calling `chatCompletion`, pass `userId` (for deterministic hashing) and `tags` to participate in routing:

```typescript
const response = await promptuna.chatCompletion({
  promptId: 'greeting',
  variables: { name: 'Alice' },
  userId: 'alice123',
  tags: ['US']
});
```
