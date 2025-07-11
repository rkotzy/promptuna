import { Promptuna } from './src/index.js';
import { ProviderError } from './src/errors';
import type {
  Provider,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from './src/providers/types';

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
    // Optional: Full validation for CI/CD environments
    try {
      console.log('Running full validation...');
      const { loadAndValidateConfig } = await import('promptuna/validate');
      await loadAndValidateConfig('./promptuna-example.json');
      console.log('✅ Full validation passed');
    } catch (error: any) {
      console.log('❌ Full validation failed:', error.message);
      throw error;
    }

    // Demonstrate template processing
    console.log('\n--- Template Processing Demo ---');

    // Simple variable example - uses default variant
    const simpleVariables = { name: 'Alice' };
    const simpleMessages = await promptuna.getTemplate({
      promptId: 'greeting',
      variantId: 'v_default', // Specify concrete default variant
      variables: simpleVariables,
    });

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

    const complexMessages = await promptuna.getTemplate({
      promptId: 'greeting',
      variantId: 'v_us', // Specific variant
      variables: complexVariables,
    });

    console.log('\n🔹 Complex template (nested objects):');
    complexMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });

    // Demonstrate chat completion (if API keys are provided)
    if (process.env.OPENAI_API_KEY) {
      console.log('\n--- Chat Completion Demo (Routing) ---');

      try {
        // Example 1: Tag-based routing (US)
        const responseUS = await promptuna.chatCompletion({
          promptId: 'greeting',
          variables: { name: 'Charlie', city: 'New York' },
          userId: 'user-us-123',
          tags: ['US'],
        });
        console.log('\n🔹 US tag (user-us-123):');
        console.log(`  Model: ${responseUS.model}`);
        console.log(`  Content: ${responseUS.choices[0].message.content}`);

        // Example 2: Tag-based routing (beta)
        const responseBeta = await promptuna.chatCompletion({
          promptId: 'greeting',
          variables: { name: 'Dana', city: 'Austin' },
          userId: 'user-beta-456',
          tags: ['beta'],
        });
        console.log('\n🔹 Beta tag (user-beta-456):');
        console.log(`  Model: ${responseBeta.model}`);
        console.log(`  Content: ${responseBeta.choices[0].message.content}`);

        // Example 3: No tags (weight distribution)
        const responseNoTag = await promptuna.chatCompletion({
          promptId: 'greeting',
          variables: { name: 'Eve', city: 'London' },
          userId: 'user-general-789', // no tags provided
        });
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
        const responseFallback = await promptuna.chatCompletion({
          promptId: 'greeting',
          variables: { name: 'Frank', city: 'Paris' },
          userId: 'user-fallback-999',
        });

        console.log(
          '\n🔹 Forced error — fallback engaged (user-fallback-999):'
        );
        console.log(`  Model: ${responseFallback.model}`);
        console.log(
          `  Content: ${responseFallback.choices[0].message.content}`
        );

        // Example 4: Message history for conversation context
        console.log('\n--- Message History Demo ---');
        const historyResponse = await promptuna.chatCompletion({
          promptId: 'greeting',
          variables: { name: 'Sam' },
          messageHistory: [
            { role: 'user', content: 'Hello, I need help with my account' },
            {
              role: 'assistant',
              content:
                'I would be happy to help you with your account. What specific issue are you experiencing?',
            },
            { role: 'user', content: 'I forgot my password' },
          ],
          userId: 'user-history-demo',
        });

        console.log('\n🔹 With conversation history:');
        console.log(`  Model: ${historyResponse.model}`);
        console.log(`  Content: ${historyResponse.choices[0].message.content}`);
        console.log(
          `  (Note: Response includes context from previous messages)`
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
    if (error instanceof Error && 'details' in error) {
      console.error('Details:', (error as any).details);
    }

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
