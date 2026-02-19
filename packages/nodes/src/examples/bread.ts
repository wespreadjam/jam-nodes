import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for bread node
 */
export const BreadInputSchema = z.object({});

export type BreadInput = z.infer<typeof BreadInputSchema>;

/**
 * Output schema for bread node
 */
export const BreadOutputSchema = z.object({
  message: z.string(),
});

export type BreadOutput = z.infer<typeof BreadOutputSchema>;

/**
 * Bread node - always outputs "bread"
 */
export const breadNode = defineNode({
  type: 'bread',
  name: 'Bread',
  description: 'Always outputs the string "bread"',
  category: 'action', // or 'example' if that was a category, but 'action' fits best from core types
  inputSchema: BreadInputSchema,
  outputSchema: BreadOutputSchema,
  estimatedDuration: 0,
  executor: async () => {
    return {
      success: true,
      output: {
        message: 'bread',
      },
    };
  },
});
