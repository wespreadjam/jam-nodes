import { describe, it, expect } from 'vitest';
import { loopNode, LoopInputSchema } from '../loop';

describe('loopNode', () => {
  it('should have correct metadata', () => {
    expect(loopNode.type).toBe('loop');
    expect(loopNode.category).toBe('logic');
    expect(loopNode.name).toBe('Loop');
  });

  it('should validate valid input', () => {
    const result = LoopInputSchema.safeParse({
      items: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const result = LoopInputSchema.parse({
      items: [1, 2, 3],
    });
    expect(result.concurrency).toBe(1);
    expect(result.delayMs).toBe(0);
    expect(result.continueOnError).toBe(false);
  });

  it('should reject invalid concurrency', () => {
    const result = LoopInputSchema.safeParse({
      items: [1],
      concurrency: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative delay', () => {
    const result = LoopInputSchema.safeParse({
      items: [1],
      delayMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should handle empty array', async () => {
    const mockContext = {
      userId: 'test',
      workflowExecutionId: 'test',
      credentials: {},
      variables: {},
      interpolate: (s: string) => s,
      evaluateJsonPath: (s: string) => s,
    };

    const result = await loopNode.executor(
      { items: [], concurrency: 1, delayMs: 0, continueOnError: false },
      mockContext as any
    );

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual([]);
  });

  it('should process items sequentially', async () => {
    const mockContext = {
      userId: 'test',
      workflowExecutionId: 'test',
      credentials: {},
      variables: {},
      interpolate: (s: string) => s,
      evaluateJsonPath: (s: string) => s,
    };

    const result = await loopNode.executor(
      { items: ['a', 'b', 'c'], concurrency: 1, delayMs: 0, continueOnError: false },
      mockContext as any
    );

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual(['a', 'b', 'c']);
  });

  it('should process items concurrently', async () => {
    const mockContext = {
      userId: 'test',
      workflowExecutionId: 'test',
      credentials: {},
      variables: {},
      interpolate: (s: string) => s,
      evaluateJsonPath: (s: string) => s,
    };

    const result = await loopNode.executor(
      { items: [1, 2, 3, 4, 5], concurrency: 3, delayMs: 0, continueOnError: false },
      mockContext as any
    );

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual([1, 2, 3, 4, 5]);
  });
});
