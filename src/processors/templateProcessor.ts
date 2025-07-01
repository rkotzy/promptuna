import { Liquid } from "liquidjs";
import { TemplateError } from "../types/config";

export class TemplateProcessor {
  private liquid: Liquid;

  constructor() {
    this.liquid = new Liquid({
      strictVariables: false,
      strictFilters: false,
    });

    this.registerCustomFilters();
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
      return await this.liquid.parseAndRender(template, variables);
    } catch (error: any) {
      throw new TemplateError(`Failed to render template: ${error.message}`, {
        template: template,
        variables: Object.keys(variables),
        error: error.message,
      });
    }
  }

  private registerCustomFilters(): void {
    // Join array with separator
    this.liquid.registerFilter("join", (array: any[], separator = ", ") => {
      if (!Array.isArray(array)) return array;
      return array.join(separator);
    });

    // Number list items (1-indexed)
    this.liquid.registerFilter("numbered", (array: any[], prefix = "  ") => {
      if (!Array.isArray(array)) return array;
      return array.map((item, index) => `${prefix}${index + 1}. ${item}`);
    });

    // Default value filter
    this.liquid.registerFilter("default", (value: any, defaultValue: any) => {
      return value !== null && value !== undefined && value !== ""
        ? value
        : defaultValue;
    });

    // Capitalize first letter
    this.liquid.registerFilter("capitalize", (str: string) => {
      if (typeof str !== "string") return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Convert to lowercase
    this.liquid.registerFilter("downcase", (str: string) => {
      if (typeof str !== "string") return str;
      return str.toLowerCase();
    });

    // Convert to uppercase
    this.liquid.registerFilter("upcase", (str: string) => {
      if (typeof str !== "string") return str;
      return str.toUpperCase();
    });

    // Size/length filter
    this.liquid.registerFilter("size", (value: any) => {
      if (Array.isArray(value) || typeof value === "string") {
        return value.length;
      }
      if (typeof value === "object" && value !== null) {
        return Object.keys(value).length;
      }
      return 0;
    });
  }
}
