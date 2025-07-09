/**
 * Shared custom filters for Liquid templates
 * Used by TemplateProcessor, ConfigLoader, and ConfigValidator
 */

/**
 * Registers all custom filters with a Liquid instance
 * @param liquid The Liquid instance to register filters with
 */
export function registerCustomFilters(liquid: any): void {
  // Join array with separator
  liquid.registerFilter('join', (array: any[], separator = ', ') => {
    if (!Array.isArray(array)) return array;
    return array.join(separator);
  });

  // Number list items (1-indexed)
  liquid.registerFilter('numbered', (array: any[], prefix = '  ') => {
    if (!Array.isArray(array)) return array;
    return array.map((item, index) => `${prefix}${index + 1}. ${item}`);
  });

  // Default value filter
  liquid.registerFilter('default', (value: any, defaultValue: any) => {
    return value !== null && value !== undefined && value !== ''
      ? value
      : defaultValue;
  });

  // Capitalize first letter
  liquid.registerFilter('capitalize', (str: string) => {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Convert to lowercase
  liquid.registerFilter('downcase', (str: string) => {
    if (typeof str !== 'string') return str;
    return str.toLowerCase();
  });

  // Convert to uppercase
  liquid.registerFilter('upcase', (str: string) => {
    if (typeof str !== 'string') return str;
    return str.toUpperCase();
  });

  // Size/length filter
  liquid.registerFilter('size', (value: any) => {
    if (Array.isArray(value) || typeof value === 'string') {
      return value.length;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length;
    }
    return 0;
  });
}

/**
 * Provides helpful suggestions for common template errors
 * @param errorMessage The error message from template processing
 * @returns A helpful suggestion string
 */
export function getTemplateSuggestion(errorMessage: string): string {
  if (errorMessage.includes('unexpected token')) {
    return 'Check for missing closing braces }} or %} in your template';
  }
  if (errorMessage.includes('Unknown filter')) {
    return 'Available custom filters: join, numbered, default, capitalize, downcase, upcase, size';
  }
  if (errorMessage.includes('filter')) {
    return 'Available filters: join, numbered, default, capitalize, downcase, upcase, size';
  }
  if (errorMessage.includes('EOF')) {
    return 'Template appears to be incomplete - check for missing closing tags';
  }
  return 'Check the template syntax for missing braces, quotes, or closing tags';
}

/**
 * List of available custom filter names
 */
export const CUSTOM_FILTER_NAMES = [
  'join',
  'numbered',
  'default',
  'capitalize',
  'downcase',
  'upcase',
  'size',
] as const;
