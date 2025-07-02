import { Promptuna } from './dist/index.js';

// Example usage of the Promptuna SDK
async function main() {
  // Initialize the SDK with config file and API keys
  const promptuna = new Promptuna({
    configPath: './promptuna-example.json',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
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
      undefined, // Uses default variant
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
      console.log('\n--- Chat Completion Demo ---');

      try {
        const response = await promptuna.chatCompletion(
          'greeting',
          complexVariables // Uses default variant automatically
        );

        console.log('\n🔹 Chat completion response:');
        console.log(`  Model: ${response.model}`);
        console.log(`  Content: ${response.choices[0].message.content}`);
        if (response.usage) {
          console.log(`  Tokens: ${response.usage.total_tokens} total`);
        }
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
