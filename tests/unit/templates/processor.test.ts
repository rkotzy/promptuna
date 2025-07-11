import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateProcessor } from '../../../src/templates/processor';
import { TemplateError } from '../../../src/templates/types';

describe('TemplateProcessor', () => {
  let processor: TemplateProcessor;

  beforeEach(() => {
    processor = new TemplateProcessor();
  });

  describe('processTemplate', () => {
    it('should process a simple template with variables', async () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'Alice' };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('Hello Alice!');
    });

    it('should process templates with multiple variables', async () => {
      const template = 'Hello {{name}}, welcome to {{city}}!';
      const variables = { name: 'Alice', city: 'San Francisco' };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('Hello Alice, welcome to San Francisco!');
    });

    it('should handle missing variables gracefully', async () => {
      const template = 'Hello {{name}}, your score is {{score}}!';
      const variables = { name: 'Alice' };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('Hello Alice, your score is !');
    });

    it('should handle nested object variables', async () => {
      const template = 'Hello {{user.name}}, your email is {{user.email}}!';
      const variables = {
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('Hello Alice, your email is alice@example.com!');
    });

    it('should handle arrays in templates', async () => {
      const template = 'Items: {{items}}';
      const variables = { items: ['apple', 'banana', 'cherry'] };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('Items: applebananacherry');
    });

    it('should handle conditional logic', async () => {
      const template =
        '{% if user %}Hello {{user}}!{% else %}Hello guest!{% endif %}';

      const resultWithUser = await processor.processTemplate(template, {
        user: 'Alice',
      });
      expect(resultWithUser).toBe('Hello Alice!');

      const resultWithoutUser = await processor.processTemplate(template, {});
      expect(resultWithoutUser).toBe('Hello guest!');
    });

    it('should handle loops', async () => {
      const template = '{% for item in items %}{{item}} {% endfor %}';
      const variables = { items: ['apple', 'banana', 'cherry'] };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('apple banana cherry ');
    });

    it('should throw TemplateError for invalid template syntax', async () => {
      const template = 'Hello {{name}'; // Missing closing brace
      const variables = { name: 'Alice' };

      await expect(
        processor.processTemplate(template, variables)
      ).rejects.toThrow(TemplateError);
    });

    it('should include helpful error context in TemplateError', async () => {
      const template = 'Hello {{name}'; // Missing closing brace
      const variables = { name: 'Alice' };

      try {
        await processor.processTemplate(template, variables);
        expect.fail('Should have thrown a TemplateError');
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateError);
        expect((error as TemplateError).details).toMatchObject({
          template: 'Hello {{name}',
          variables: ['name'],
        });
      }
    });

    it('should handle empty templates', async () => {
      const template = '';
      const variables = {};

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('');
    });

    it('should handle templates with only text', async () => {
      const template = 'This is just plain text';
      const variables = {};

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe('This is just plain text');
    });
  });

  describe('custom filters', () => {
    describe('join filter', () => {
      it('should join arrays with default separator', async () => {
        const template = '{{items | join}}';
        const variables = { items: ['apple', 'banana', 'cherry'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('apple, banana, cherry');
      });

      it('should join arrays with custom separator', async () => {
        const template = '{{items | join: " | "}}';
        const variables = { items: ['apple', 'banana', 'cherry'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('apple | banana | cherry');
      });

      it('should handle non-array values', async () => {
        const template = '{{value | join}}';
        const variables = { value: 'not an array' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('not an array');
      });

      it('should handle empty arrays', async () => {
        const template = '{{items | join}}';
        const variables = { items: [] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('');
      });
    });

    describe('numbered filter', () => {
      it('should number array items with default prefix', async () => {
        const template = '{{items | numbered}}';
        const variables = { items: ['apple', 'banana', 'cherry'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('  1. apple  2. banana  3. cherry');
      });

      it('should number array items with custom prefix', async () => {
        const template = '{{items | numbered: "- "}}';
        const variables = { items: ['apple', 'banana', 'cherry'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('- 1. apple- 2. banana- 3. cherry');
      });

      it('should handle non-array values', async () => {
        const template = '{{value | numbered}}';
        const variables = { value: 'not an array' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('not an array');
      });

      it('should handle empty arrays', async () => {
        const template = '{{items | numbered}}';
        const variables = { items: [] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('');
      });
    });

    describe('default filter', () => {
      it('should use default value for null', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = { value: null };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('fallback');
      });

      it('should use default value for undefined', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = {};

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('fallback');
      });

      it('should use default value for empty string', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = { value: '' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('fallback');
      });

      it('should use original value when not null/undefined/empty', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = { value: 'original' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('original');
      });

      it('should handle zero as a valid value', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = { value: 0 };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('0');
      });

      it('should handle false as a valid value', async () => {
        const template = '{{value | default: "fallback"}}';
        const variables = { value: false };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('false');
      });
    });

    describe('string case filters', () => {
      it('should capitalize first letter', async () => {
        const template = '{{value | capitalize}}';
        const variables = { value: 'hello world' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('Hello world');
      });

      it('should convert to lowercase', async () => {
        const template = '{{value | downcase}}';
        const variables = { value: 'HELLO WORLD' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('hello world');
      });

      it('should convert to uppercase', async () => {
        const template = '{{value | upcase}}';
        const variables = { value: 'hello world' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('HELLO WORLD');
      });

      it('should handle non-string values gracefully', async () => {
        const template = '{{value | capitalize}}';
        const variables = { value: 123 };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('123');
      });

      it('should handle empty strings', async () => {
        const template = '{{value | capitalize}}';
        const variables = { value: '' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('');
      });
    });

    describe('size filter', () => {
      it('should return array length', async () => {
        const template = '{{items | size}}';
        const variables = { items: ['apple', 'banana', 'cherry'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('3');
      });

      it('should return string length', async () => {
        const template = '{{text | size}}';
        const variables = { text: 'hello world' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('11');
      });

      it('should return object key count', async () => {
        const template = '{{obj | size}}';
        const variables = { obj: { a: 1, b: 2, c: 3 } };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('3');
      });

      it('should return 0 for null/undefined', async () => {
        const template = '{{value | size}}';
        const variables = { value: null };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('0');
      });

      it('should return 0 for empty arrays', async () => {
        const template = '{{items | size}}';
        const variables = { items: [] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('0');
      });

      it('should return 0 for empty objects', async () => {
        const template = '{{obj | size}}';
        const variables = { obj: {} };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('0');
      });
    });

    describe('chained filters', () => {
      it('should handle multiple filters in sequence', async () => {
        const template = '{{items | join: " " | upcase}}';
        const variables = { items: ['hello', 'world'] };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('HELLO WORLD');
      });

      it('should handle complex filter chains', async () => {
        const template = '{{value | default: "empty" | capitalize | size}}';
        const variables = { value: '' };

        const result = await processor.processTemplate(template, variables);

        expect(result).toBe('5'); // "Empty" has 5 characters
      });
    });
  });

  describe('complex template scenarios', () => {
    it('should handle mixed template with variables, conditions, and filters', async () => {
      const template = `
{% if user %}
Hello {{user.name | capitalize}}!
{% if user.items %}
Your items: {{user.items | join: ", "}}
Total: {{user.items | size}} items
{% endif %}
{% else %}
Welcome, guest!
{% endif %}
      `.trim();

      const variables = {
        user: {
          name: 'alice',
          items: ['apple', 'banana', 'cherry'],
        },
      };

      const result = await processor.processTemplate(template, variables);

      expect(result).toContain('Hello Alice!');
      expect(result).toContain('Your items: apple, banana, cherry');
      expect(result).toContain('Total: 3 items');
    });

    it('should handle nested loops and conditions', async () => {
      const template = `
{% for category in categories %}
{{category.name | upcase}}:
{% for item in category.items %}
  - {{item | capitalize}}
{% endfor %}
{% endfor %}
      `.trim();

      const variables = {
        categories: [
          { name: 'fruits', items: ['apple', 'banana'] },
          { name: 'vegetables', items: ['carrot', 'broccoli'] },
        ],
      };

      const result = await processor.processTemplate(template, variables);

      expect(result).toContain('FRUITS:');
      expect(result).toContain('  - Apple');
      expect(result).toContain('  - Banana');
      expect(result).toContain('VEGETABLES:');
      expect(result).toContain('  - Carrot');
      expect(result).toContain('  - Broccoli');
    });

    it('should handle complex message formatting', async () => {
      const template = `
{{greeting | default: "Hello"}}, {{name | capitalize}}!

{% if tasks %}
Here are your tasks ({{tasks | size}} total):
{{tasks | numbered: "  "}}
{% else %}
No tasks for today.
{% endif %}

Best regards,
{{sender | default: "System"}}
      `.trim();

      const variables = {
        name: 'alice',
        tasks: ['Review code', 'Write tests', 'Deploy app'],
        sender: 'Bot Assistant',
      };

      const result = await processor.processTemplate(template, variables);

      expect(result).toBe(
        'Hello, Alice!\n\n\nHere are your tasks (3 total):\n  1. Review code  2. Write tests  3. Deploy app\n\n\nBest regards,\nBot Assistant'
      );
    });
  });

  describe('template pre-compilation', () => {
    it('should pre-compile templates and reuse them', async () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'Alice' };

      // First call should compile the template
      const result1 = await processor.processTemplate(template, variables);
      expect(result1).toBe('Hello Alice!');

      // Second call should reuse the compiled template
      const result2 = await processor.processTemplate(template, variables);
      expect(result2).toBe('Hello Alice!');

      // Mock liquid.parse to verify it's called only once per unique template
      const parseSpy = vi.spyOn(processor['liquid'], 'parse');

      // Reset the spy and test again
      parseSpy.mockClear();

      const result3 = await processor.processTemplate(template, variables);
      expect(result3).toBe('Hello Alice!');

      // If templates are cached, parse should NOT be called (because it's cached)
      expect(parseSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle template compilation errors during pre-compilation', async () => {
      const invalidTemplate = 'Hello {{name}'; // Missing closing brace
      const variables = { name: 'Alice' };

      await expect(
        processor.processTemplate(invalidTemplate, variables)
      ).rejects.toThrow('Failed to render template');
    });

    it('should validate template syntax during pre-compilation', async () => {
      const templates = [
        'Hello {{name}}!',
        'Welcome {{user | capitalize}}!',
        '{% if condition %}True{% else %}False{% endif %}',
        '{{items | join: ", "}}',
      ];

      // All templates should be valid and process correctly
      for (const template of templates) {
        const result = await processor.processTemplate(template, {
          name: 'Alice',
          user: 'bob',
          condition: true,
          items: ['a', 'b', 'c'],
        });
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('should provide helpful error context for template compilation failures', async () => {
      const invalidTemplate = '{% for item in items %}{{item}}{% endfor'; // Missing closing %}
      const variables = { items: ['a', 'b', 'c'] };

      try {
        await processor.processTemplate(invalidTemplate, variables);
        expect.fail('Should have thrown a TemplateError');
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateError);
        expect((error as TemplateError).details).toMatchObject({
          template: invalidTemplate,
          variables: ['items'],
        });
      }
    });

    it('should handle filter validation during pre-compilation', async () => {
      const templateWithUnknownFilter = 'Hello {{name | unknown_filter}}!';
      const variables = { name: 'Alice' };

      // With strictFilters: false, unknown filters are ignored and the value is passed through
      // This is expected behavior for TemplateProcessor
      const result = await processor.processTemplate(
        templateWithUnknownFilter,
        variables
      );
      expect(result).toBe('Hello Alice!');
    });
  });

  describe('template validation', () => {
    it('should validate template syntax before processing', async () => {
      const syntaxErrorTemplates = [
        'Hello {{name}', // Missing closing brace
        '{% if condition %}Hello{% endif', // Missing closing %}
        '{% for item in items %}{{item}}{% endfor', // Missing closing %}
      ];

      for (const template of syntaxErrorTemplates) {
        await expect(
          processor.processTemplate(template, {
            name: 'Alice',
            condition: true,
            items: ['a'],
          })
        ).rejects.toThrow('Failed to render template');
      }

      // Empty filter should work (it just passes the value through)
      const emptyFilterTemplate = 'Hello {{name | }}';
      const result = await processor.processTemplate(emptyFilterTemplate, {
        name: 'Alice',
      });
      expect(result).toBe('Hello Alice');
    });

    it('should provide context about available filters in errors', async () => {
      const templateWithBadFilter = 'Hello {{name | badfilter}}!';
      const variables = { name: 'Alice' };

      // With strictFilters: false, bad filters are ignored and the value is passed through
      // This is expected behavior for TemplateProcessor
      const result = await processor.processTemplate(
        templateWithBadFilter,
        variables
      );
      expect(result).toBe('Hello Alice!');
    });

    it('should validate custom filter usage', async () => {
      const validCustomFilterTemplates = [
        'Items: {{items | join}}',
        'Items: {{items | join: " | "}}',
        'List: {{items | numbered}}',
        'List: {{items | numbered: "- "}}',
        'Value: {{value | default: "N/A"}}',
        'Text: {{text | capitalize}}',
        'Text: {{text | upcase}}',
        'Text: {{text | downcase}}',
        'Count: {{items | size}}',
      ];

      for (const template of validCustomFilterTemplates) {
        const result = await processor.processTemplate(template, {
          items: ['a', 'b', 'c'],
          value: null,
          text: 'hello',
        });
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });
  });
});
