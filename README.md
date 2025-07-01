# Promptuna SDK

A TypeScript SDK for LLM prompt management using a configuration-based approach.

## Installation

```bash
npm install
npm run build
```

## Basic Usage

```typescript
import { Promptuna } from 'promptuna';

async function main() {
  // Initialize with config file path
  const promptuna = new Promptuna('./promptuna-example.json');

  try {
    // Load and validate configuration in one step
    const config = await promptuna.loadAndValidateConfig();
    console.log('✅ Configuration is valid!');
    console.log(`Version: ${config.version}`);
    console.log(`Providers: ${Object.keys(config.providers).length}`);
  } catch (error) {
    console.error('❌ Configuration is invalid!');
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
```

## Project Structure

```
promptuna/
├── src/
│   ├── index.ts          # Main exports
│   ├── Promptuna.ts      # Core SDK class
│   ├── validators/
│   │   └── configValidator.ts    # Schema validation
│   └── types/
│       └── config.ts     # TypeScript types
├── schema.json           # Configuration schema
├── promptuna-example.json # Example configuration
└── example.ts            # Usage example
```

## Configuration

The SDK validates configuration files against the JSON schema defined in `schema.json`. See `promptuna-example.json` for a complete example.

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run example
npx ts-node example.ts
```