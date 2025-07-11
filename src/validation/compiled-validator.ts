// Stub file for TypeScript compilation
// The actual compiled validator will be generated during build
// This provides basic validation for development/tsx usage

interface ValidatorError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params?: Record<string, any>;
  message: string;
  schema?: any;
  parentSchema?: any;
  data?: any;
}

interface ValidatorFunction {
  (data: any, options?: any): boolean;
  errors?: ValidatorError[] | null;
}

// Basic validation function for development
const validateConfig: ValidatorFunction = function (data: any): boolean {
  validateConfig.errors = null;

  if (!data || typeof data !== 'object') {
    validateConfig.errors = [
      {
        instancePath: '',
        schemaPath: '#/type',
        keyword: 'type',
        params: { type: 'object' },
        message: 'must be object',
      },
    ];
    return false;
  }

  // Check required fields
  const required = ['version', 'providers', 'prompts'];
  const missing = required.filter(field => !(field in data));

  if (missing.length > 0) {
    validateConfig.errors = missing.map(field => ({
      instancePath: '',
      schemaPath: '#/required',
      keyword: 'required',
      params: { missingProperty: field },
      message: `must have required property '${field}'`,
    }));
    return false;
  }

  // Basic structure validation
  if (typeof data.version !== 'string') {
    validateConfig.errors = [
      {
        instancePath: '/version',
        schemaPath: '#/properties/version/type',
        keyword: 'type',
        params: { type: 'string' },
        message: 'must be string',
      },
    ];
    return false;
  }

  if (!data.providers || typeof data.providers !== 'object') {
    validateConfig.errors = [
      {
        instancePath: '/providers',
        schemaPath: '#/properties/providers/type',
        keyword: 'type',
        params: { type: 'object' },
        message: 'must be object',
      },
    ];
    return false;
  }

  if (!data.prompts || typeof data.prompts !== 'object') {
    validateConfig.errors = [
      {
        instancePath: '/prompts',
        schemaPath: '#/properties/prompts/type',
        keyword: 'type',
        params: { type: 'object' },
        message: 'must be object',
      },
    ];
    return false;
  }

  // If we get here, basic validation passed
  return true;
};

validateConfig.errors = null;

export default validateConfig;
