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
  } catch (error) {
    console.error("❌ Configuration is invalid!");
    console.error("Error:", error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
