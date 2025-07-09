import { Liquid } from 'liquidjs';
import { TemplateError } from './types';
import { registerCustomFilters, getTemplateSuggestion } from './filters';

export class TemplateProcessor {
  private liquid: Liquid;
  private templateCache: Map<string, any> = new Map();

  constructor() {
    this.liquid = new Liquid({
      strictVariables: false,
      strictFilters: false,
    });

    registerCustomFilters(this.liquid);
  }

  /**
   * Processes a template string with the provided variables
   * @param template The template string with liquid syntax (e.g., "Hello {{name}}!")
   * @param variables The variables to interpolate into the template
   * @returns The rendered template string
   * @throws Error if template processing fails or variables are missing
   */
  async processTemplate(
    template: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      // Check if template is already compiled and cached
      let compiledTemplate = this.templateCache.get(template);

      if (!compiledTemplate) {
        // Parse and compile the template
        compiledTemplate = this.liquid.parse(template);
        this.templateCache.set(template, compiledTemplate);
      }

      // Render the compiled template with variables
      return await this.liquid.renderSync(compiledTemplate, variables);
    } catch (error: any) {
      throw new TemplateError(`Failed to render template: ${error.message}`, {
        template: template,
        variables: Object.keys(variables),
        error: error.message,
        suggestion: getTemplateSuggestion(error.message),
      });
    }
  }

  /**
   * Validates template syntax without rendering
   * @param template The template string to validate
   * @throws TemplateError if template has invalid syntax
   */
  validateTemplate(template: string): void {
    try {
      this.liquid.parse(template);
    } catch (error: any) {
      throw new TemplateError(`Template syntax error: ${error.message}`, {
        template: template,
        error: error.message,
        suggestion: getTemplateSuggestion(error.message),
      });
    }
  }

  /**
   * Clears the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Gets the number of cached templates
   */
  getCacheSize(): number {
    return this.templateCache.size;
  }
}
