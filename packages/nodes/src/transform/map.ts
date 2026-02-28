import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { resolvePath } from '../utils/resolve-path.js';

/**
 * Input schema for map node
 */
export const MapInputSchema = z.object({
  /** Array of items to transform */
  items: z.array(z.unknown()),
  /** Property path to extract from each item (dot notation) */
  path: z.string(),
});

export type MapInput = z.infer<typeof MapInputSchema>;

/**
 * Output schema for map node
 */
export const MapOutputSchema = z.object({
  results: z.array(z.unknown()),
  count: z.number(),
});

export type MapOutput = z.infer<typeof MapOutputSchema>;

/**
 * Map node - extract a property from each item in an array.
 *
 * Useful for transforming data between nodes.
 *
 * @example
 * ```typescript
 * // Extract emails from contacts
 * {
 *   items: '{{contacts}}',
 *   path: 'email'
 * }
 * // Returns: { results: ['a@example.com', 'b@example.com'], count: 2 }
 * ```
 */
export const mapNode = defineNode({
  type: 'map',
  name: 'Map',
  description: 'Extract a property from each item in an array',
  category: 'transform',
  inputSchema: MapInputSchema,
  outputSchema: MapOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input) => {
    try {
      const results = input.items.map((item) => resolvePath(item, input.path));

      return {
        success: true,
        output: {
          results,
          count: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Map operation failed',
      };
    }
  },
});
