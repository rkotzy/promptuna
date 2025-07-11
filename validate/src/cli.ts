#!/usr/bin/env node
import { ConfigValidator } from '../../src/validation/ConfigValidator';
import { resolve } from 'path';

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(
      `Promptuna Configuration Validator\n\nUsage: promptuna-validate <config-file>`
    );
    process.exit(0);
  }
  const configPath = resolve(args[0]);
  const validator = new ConfigValidator();
  try {
    await validator.validateAndLoadConfigFile(configPath);
    console.log('✅ Configuration valid');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Validation failed:', err.message);
    process.exit(1);
  }
})();
