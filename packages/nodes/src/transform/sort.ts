import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const SortInputSchema = z.object({
  items: z.array(z.unknown()),
  path: z.string(),
  direction: SortDirectionSchema.default('asc'),
});

export type SortInput = z.infer<typeof SortInputSchema>;

export const SortOutputSchema = z.object({
  results: z.array(z.unknown()),
  count: z.number(),
});

export type SortOutput = z.infer<typeof SortOutputSchema>;

function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return String(a).localeCompare(String(b));
}

export const sortNode = defineNode({
  type: 'sort',
  name: 'Sort',
  description: 'Sort array by a property path',
  category: 'transform',
  inputSchema: SortInputSchema,
  outputSchema: SortOutputSchema,
  estimatedDuration: 0,
  capabilities: { supportsRerun: true },
  executor: async (input) => {
    try {
      const { direction } = input;
      const results = [...input.items].sort((a, b) => {
        const va = resolvePath(a, input.path);
        const vb = resolvePath(b, input.path);
        return direction === 'asc' ? compare(va, vb) : -compare(va, vb);
      });
      return {
        success: true,
        output: { results, count: results.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sort failed',
      };
    }
  },
});
