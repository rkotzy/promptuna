import { Promptuna } from "./src";

// Example usage of the Promptuna SDK
async function main() {
  // Initialize the SDK with config file and API keys
  const promptuna = new Promptuna({
    configPath: "./promptuna-example.json",
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Load and validate the configuration
    console.log("Loading and validating configuration...");
    const config = await promptuna.loadAndValidateConfig();

    console.log("✅ Configuration is valid!");
    console.log(`Loaded configuration version: ${config.version}`);
    console.log(`Number of providers: ${Object.keys(config.providers).length}`);
    console.log(`Number of prompts: ${Object.keys(config.prompts).length}`);

    // Demonstrate template processing
    console.log("\n--- Template Processing Demo ---");
    
    // Simple variable example
    const simpleVariables = { name: "Alice" };
    const simpleMessages = await promptuna.getVariantTemplate(
      "greeting", 
      "v_default", 
      simpleVariables
    );
    
    console.log("\n🔹 Simple template (name: 'Alice'):");
    simpleMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });
    
    // Complex nested object example
    const complexVariables = {
      name: "Bob",
      city: "San Francisco",
      user: {
        firstName: "Robert",
        lastName: "Smith",
        preferences: {
          style: "casual"
        }
      }
    };
    
    const complexMessages = await promptuna.getVariantTemplate(
      "greeting",
      "v_us",
      complexVariables
    );
    
    console.log("\n🔹 Complex template (nested objects):");
    complexMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });

    // Demonstrate chat completion (if API keys are provided)
    if (process.env.OPENAI_API_KEY) {
      console.log("\n--- Chat Completion Demo ---");
      
      try {
        const response = await promptuna.chatCompletion(
          "greeting",
          "v_default",
          { name: "Alice" }
        );
        
        console.log("\n🔹 Chat completion response:");
        console.log(`  Model: ${response.model}`);
        console.log(`  Content: ${response.choices[0].message.content}`);
        if (response.usage) {
          console.log(`  Tokens: ${response.usage.total_tokens} total`);
        }
      } catch (chatError) {
        console.log("\n⚠️  Chat completion failed (this is expected if API keys aren't set):");
        console.log(`  ${chatError instanceof Error ? chatError.message : chatError}`);
      }
    } else {
      console.log("\n💡 To test chat completions, set environment variables:");
      console.log("   export OPENAI_API_KEY='your-key'");
      console.log("   export ANTHROPIC_API_KEY='your-key'");
    }
    
  } catch (error) {
    console.error("❌ Error occurred!");
    console.error("Error:", error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('API key not provided')) {
      console.log("\n💡 Make sure to set your API keys as environment variables:");
      console.log("   export OPENAI_API_KEY='your-openai-key'");
      console.log("   export ANTHROPIC_API_KEY='your-anthropic-key'");
    }
  }
}

main().catch(console.error);
