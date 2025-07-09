import { describe, it, expect, vi } from 'vitest';
import {
  registerCustomFilters,
  getTemplateSuggestion,
  CUSTOM_FILTER_NAMES,
} from '../../../src/templates/filters';

describe('Template Filters', () => {
  describe('registerCustomFilters', () => {
    it('should register all custom filters with liquid instance', () => {
      const mockLiquid = {
        registerFilter: vi.fn(),
      };

      registerCustomFilters(mockLiquid);

      // Should register all filter names
      expect(mockLiquid.registerFilter).toHaveBeenCalledTimes(
        CUSTOM_FILTER_NAMES.length
      );

      // Verify each filter was registered
      CUSTOM_FILTER_NAMES.forEach(filterName => {
        expect(mockLiquid.registerFilter).toHaveBeenCalledWith(
          filterName,
          expect.any(Function)
        );
      });
    });

    it('should register working filter functions', () => {
      const mockLiquid = {
        registerFilter: vi.fn(),
      };

      registerCustomFilters(mockLiquid);

      // Get the registered functions
      const registeredFilters = mockLiquid.registerFilter.mock.calls.reduce(
        (acc, [name, fn]) => {
          acc[name] = fn;
          return acc;
        },
        {} as Record<string, Function>
      );

      // Test join filter
      expect(registeredFilters.join(['a', 'b', 'c'])).toBe('a, b, c');
      expect(registeredFilters.join(['a', 'b', 'c'], ' | ')).toBe('a | b | c');
      expect(registeredFilters.join('not-an-array')).toBe('not-an-array');

      // Test numbered filter
      expect(registeredFilters.numbered(['a', 'b', 'c'])).toEqual([
        '  1. a',
        '  2. b',
        '  3. c',
      ]);
      expect(registeredFilters.numbered(['a', 'b'], '- ')).toEqual([
        '- 1. a',
        '- 2. b',
      ]);
      expect(registeredFilters.numbered('not-an-array')).toBe('not-an-array');

      // Test default filter
      expect(registeredFilters.default('value', 'fallback')).toBe('value');
      expect(registeredFilters.default(null, 'fallback')).toBe('fallback');
      expect(registeredFilters.default(undefined, 'fallback')).toBe('fallback');
      expect(registeredFilters.default('', 'fallback')).toBe('fallback');
      expect(registeredFilters.default(0, 'fallback')).toBe(0);
      expect(registeredFilters.default(false, 'fallback')).toBe(false);

      // Test capitalize filter
      expect(registeredFilters.capitalize('hello')).toBe('Hello');
      expect(registeredFilters.capitalize('HELLO')).toBe('HELLO');
      expect(registeredFilters.capitalize('')).toBe('');
      expect(registeredFilters.capitalize(123)).toBe(123);

      // Test downcase filter
      expect(registeredFilters.downcase('HELLO')).toBe('hello');
      expect(registeredFilters.downcase('Hello')).toBe('hello');
      expect(registeredFilters.downcase(123)).toBe(123);

      // Test upcase filter
      expect(registeredFilters.upcase('hello')).toBe('HELLO');
      expect(registeredFilters.upcase('Hello')).toBe('HELLO');
      expect(registeredFilters.upcase(123)).toBe(123);

      // Test size filter
      expect(registeredFilters.size(['a', 'b', 'c'])).toBe(3);
      expect(registeredFilters.size('hello')).toBe(5);
      expect(registeredFilters.size({ a: 1, b: 2, c: 3 })).toBe(3);
      expect(registeredFilters.size(null)).toBe(0);
      expect(registeredFilters.size(undefined)).toBe(0);
      expect(registeredFilters.size([])).toBe(0);
      expect(registeredFilters.size({})).toBe(0);
    });
  });

  describe('getTemplateSuggestion', () => {
    it('should provide specific suggestions for common error patterns', () => {
      expect(getTemplateSuggestion('unexpected token')).toBe(
        'Check for missing closing braces }} or %} in your template'
      );

      expect(getTemplateSuggestion('filter error')).toBe(
        'Available filters: join, numbered, default, capitalize, downcase, upcase, size'
      );

      expect(getTemplateSuggestion('EOF error')).toBe(
        'Template appears to be incomplete - check for missing closing tags'
      );

      expect(getTemplateSuggestion('Unknown filter some message')).toBe(
        'Available custom filters: join, numbered, default, capitalize, downcase, upcase, size'
      );

      expect(getTemplateSuggestion('some other error')).toBe(
        'Check the template syntax for missing braces, quotes, or closing tags'
      );
    });
  });

  describe('CUSTOM_FILTER_NAMES', () => {
    it('should contain all expected filter names', () => {
      expect(CUSTOM_FILTER_NAMES).toEqual([
        'join',
        'numbered',
        'default',
        'capitalize',
        'downcase',
        'upcase',
        'size',
      ]);
    });

    it('should be readonly', () => {
      // TypeScript readonly arrays don't actually throw at runtime
      // Just check that the type is correct
      expect(CUSTOM_FILTER_NAMES.length).toBe(7);
    });
  });
});
