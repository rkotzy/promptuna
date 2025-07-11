#!/usr/bin/env node

import { resolve } from 'path';
import { loadAndValidateConfig } from './index.js';

(async () => {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Promptuna Configuration Validator

Usage: promptuna-validate <config-file>

Options:
  -h, --help     Show this help message

Examples:
  promptuna-validate config.json
  promptuna-validate ./path/to/config.json
`);
    process.exit(0);
  }

  const configPath = resolve(args[0]);

  try {
    const startTime = Date.now();
    const config = await loadAndValidateConfig(configPath);
    const duration = Date.now() - startTime;

    // Count configuration elements
    const promptCount = Object.keys(config.prompts).length;
    const providerCount = Object.keys(config.providers).length;
    const schemaCount = Object.keys(config.responseSchemas || {}).length;

    console.log('✅ Configuration valid');
    console.log(`   Version: ${config.version}`);
    console.log(`   Prompts: ${promptCount}`);
    console.log(`   Providers: ${providerCount}`);
    if (schemaCount > 0) {
      console.log(`   Response schemas: ${schemaCount}`);
    }
    console.log(`   Validation time: ${duration}ms`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Validation failed:', error.message);

    // Show detailed error information if available
    if (error.details) {
      if (error.details.errors && Array.isArray(error.details.errors)) {
        console.error('\nSchema validation errors:');
        error.details.errors.forEach((err: any, index: number) => {
          console.error(`  ${index + 1}. ${err.path}: ${err.message}`);
        });
      }

      if (error.details.suggestion) {
        console.error(`\n💡 Suggestion: ${error.details.suggestion}`);
      }
    }

    process.exit(1);
  }
})();
