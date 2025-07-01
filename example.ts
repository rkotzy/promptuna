import { Promptuna } from "./src";

// Example usage of the Promptuna SDK
async function main() {
  // Initialize the SDK with the path to your config file
  const promptuna = new Promptuna("./promptuna-example.json");

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
    
  } catch (error) {
    console.error("❌ Error occurred!");
    console.error("Error:", error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
