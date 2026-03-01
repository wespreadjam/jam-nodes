import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { resolvePath } from '../utils/resolve-path.js';

/**
 * Filter operator schema
 */
export const FilterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'exists',
  'not_exists',
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * Input schema for filter node
 */
export const FilterInputSchema = z.object({
  /** Array of items to filter */
  items: z.array(z.unknown()),
  /** Property path to check (dot notation) */
  path: z.string(),
  /** Filter operator */
  operator: FilterOperatorSchema,
  /** Value to compare against */
  value: z.unknown().optional(),
});

export type FilterInput = z.infer<typeof FilterInputSchema>;

/**
 * Output schema for filter node
 */
export const FilterOutputSchema = z.object({
  results: z.array(z.unknown()),
  count: z.number(),
  originalCount: z.number(),
});

export type FilterOutput = z.infer<typeof FilterOutputSchema>;

/**
 * Evaluate filter condition
 */
function evaluateFilter(
  operator: FilterOperator,
  actual: unknown,
  expected: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
    case 'not_contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return !actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return !actual.includes(expected);
      }
      return true;
    case 'greater_than':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'less_than':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'exists':
      return actual !== null && actual !== undefined;
    case 'not_exists':
      return actual === null || actual === undefined;
    default:
      return false;
  }
}

/**
 * Filter node - filter items in an array based on a condition.
 *
 * @example
 * ```typescript
 * // Filter contacts with email
 * {
 *   items: '{{contacts}}',
 *   path: 'email',
 *   operator: 'exists'
 * }
 *
 * // Filter high-value items
 * {
 *   items: '{{orders}}',
 *   path: 'total',
 *   operator: 'greater_than',
 *   value: 100
 * }
 * ```
 */
export const filterNode = defineNode({
  type: 'filter',
  name: 'Filter',
  description: 'Filter items in an array based on a condition',
  category: 'transform',
  inputSchema: FilterInputSchema,
  outputSchema: FilterOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input) => {
    try {
      const results = input.items.filter((item) => {
        const value = resolvePath(item, input.path);
        return evaluateFilter(input.operator, value, input.value);
      });

      return {
        success: true,
        output: {
          results,
          count: results.length,
          originalCount: input.items.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Filter operation failed',
      };
    }
  },
});
