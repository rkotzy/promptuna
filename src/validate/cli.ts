#!/usr/bin/env node
import { ConfigValidator } from './ConfigValidator.js';
import { resolve } from 'path';

/**
 * CLI tool for validating Promptuna configuration files
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Promptuna Configuration Validator

Usage:
  promptuna-validate <config-file>
  
Options:
  -h, --help    Show this help message

Examples:
  promptuna-validate config.json
  promptuna-validate ./path/to/config.json
`);
    process.exit(0);
  }

  const configPath = resolve(args[0]);
  const validator = new ConfigValidator();

  try {
    console.log(`Validating configuration: ${configPath}`);

    const startTime = Date.now();
    const config = await validator.validateAndLoadConfigFile(configPath);
    const duration = Date.now() - startTime;

    console.log('✅ Configuration valid');
    console.log(`   Version: ${config.version}`);
    console.log(`   Prompts: ${Object.keys(config.prompts).length}`);
    console.log(`   Providers: ${Object.keys(config.providers).length}`);
    if (config.responseSchemas) {
      console.log(
        `   Response schemas: ${Object.keys(config.responseSchemas).length}`
      );
    }
    console.log(`   Validation time: ${duration}ms`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Validation failed');
    console.error(`   ${error.message}`);

    if (error.details) {
      console.error('\nDetails:');
      console.error(JSON.stringify(error.details, null, 2));
    }

    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
