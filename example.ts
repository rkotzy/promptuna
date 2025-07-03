import { Promptuna } from './src/index.ts';
import { ProviderError } from './src/errors';
import type {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './src/providers/types';

// Example usage of the Promptuna SDK
async function main() {
  // Initialize the SDK with config file and API keys
  const promptuna = new Promptuna({
    configPath: './promptuna-example.json',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    onObservability: event => {
      console.log('\n📊 Observability Event');
      console.log(JSON.stringify(event, null, 2));
    },
  });

  try {
    // Load and validate the configuration
    console.log('Loading and validating configuration...');
    const config = await promptuna.loadAndValidateConfig();

    console.log('✅ Configuration is valid!');
    console.log(`Loaded configuration version: ${config.version}`);
    console.log(`Number of providers: ${Object.keys(config.providers).length}`);
    console.log(`Number of prompts: ${Object.keys(config.prompts).length}`);

    // Demonstrate template processing
    console.log('\n--- Template Processing Demo ---');

    // Simple variable example - uses default variant
    const simpleVariables = { name: 'Alice' };
    const simpleMessages = await promptuna.getTemplate(
      'greeting',
      'v_default', // Specify concrete default variant
      simpleVariables
    );

    console.log("\n🔹 Simple template (name: 'Alice'):");
    simpleMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });

    // Complex nested object example
    const complexVariables = {
      name: 'Bob',
      city: 'San Francisco',
      user: {
        firstName: 'Robert',
        lastName: 'Smith',
        preferences: {
          style: 'casual',
        },
      },
    };

    const complexMessages = await promptuna.getTemplate(
      'greeting',
      'v_us', // Specific variant
      complexVariables
    );

    console.log('\n🔹 Complex template (nested objects):');
    complexMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });

    // Demonstrate chat completion (if API keys are provided)
    if (process.env.OPENAI_API_KEY) {
      console.log('\n--- Chat Completion Demo (Routing) ---');

      try {
        // Example 1: Tag-based routing (US)
        const responseUS = await promptuna.chatCompletion(
          'greeting',
          { name: 'Charlie', city: 'New York' },
          { userId: 'user-us-123', tags: ['US'] }
        );
        console.log('\n🔹 US tag (user-us-123):');
        console.log(`  Model: ${responseUS.model}`);
        console.log(`  Content: ${responseUS.choices[0].message.content}`);

        // Example 2: Tag-based routing (beta)
        const responseBeta = await promptuna.chatCompletion(
          'greeting',
          { name: 'Dana', city: 'Austin' },
          { userId: 'user-beta-456', tags: ['beta'] }
        );
        console.log('\n🔹 Beta tag (user-beta-456):');
        console.log(`  Model: ${responseBeta.model}`);
        console.log(`  Content: ${responseBeta.choices[0].message.content}`);

        // Example 3: No tags (weight distribution)
        const responseNoTag = await promptuna.chatCompletion(
          'greeting',
          { name: 'Eve', city: 'London' },
          { userId: 'user-general-789' } // no tags provided
        );
        console.log('\n🔹 No tag (user-general-789):');
        console.log(`  Model: ${responseNoTag.model}`);
        console.log(`  Content: ${responseNoTag.choices[0].message.content}`);

        // ------------------------------------------------------------
        // Forced-error demo: swap the cached OpenAI provider instance
        // with a stub that always throws a retryable rate-limit error
        // so we can observe automatic fallback in action.
        // ------------------------------------------------------------

        class AlwaysRateLimited implements Provider {
          async chatCompletion(
            _opts: ChatCompletionOptions
          ): Promise<ChatCompletionResponse> {
            // 429 triggers "rate-limit" logic & is retryable
            throw new ProviderError(
              'rate-limit',
              'Simulated 429 Rate Limit',
              true,
              '429',
              429
            );
          }
        }

        // Replace the cached OpenAI provider (key is 'openai')
        (promptuna as any).providers.set('openai', new AlwaysRateLimited());

        // Make another call – fallback should activate automatically
        const responseFallback = await promptuna.chatCompletion(
          'greeting',
          { name: 'Frank', city: 'Paris' },
          { userId: 'user-fallback-999' }
        );

        console.log(
          '\n🔹 Forced error — fallback engaged (user-fallback-999):'
        );
        console.log(`  Model: ${responseFallback.model}`);
        console.log(
          `  Content: ${responseFallback.choices[0].message.content}`
        );
      } catch (chatError) {
        console.log('\n⚠️  Chat completion failed:');
        console.log(
          `  Error: ${chatError instanceof Error ? chatError.message : chatError}`
        );

        // Log full error details for debugging
        if (chatError instanceof Error) {
          console.log(`  Error Name: ${chatError.name}`);
          if ('code' in chatError) {
            console.log(`  Error Code: ${(chatError as any).code}`);
          }
          if ('details' in chatError) {
            console.log(`  Error Details:`, (chatError as any).details);
          }
          console.log(`  Stack Trace:`, chatError.stack);
        }
      }
    } else {
      console.log('\n💡 To test chat completions, set environment variables:');
      console.log("   export OPENAI_API_KEY='your-key'");
      console.log("   export ANTHROPIC_API_KEY='your-key'");
    }
  } catch (error) {
    console.error('❌ Error occurred!');
    console.error('Error:', error instanceof Error ? error.message : error);

    if (
      error instanceof Error &&
      error.message.includes('API key not provided')
    ) {
      console.log(
        '\n💡 Make sure to set your API keys as environment variables:'
      );
      console.log("   export OPENAI_API_KEY='your-openai-key'");
      console.log("   export ANTHROPIC_API_KEY='your-anthropic-key'");
    }
  }
}

main().catch(console.error);
