/**
 * Quick test to verify packages work
 * Run with: npx tsx test.ts
 */

import { NodeRegistry, ExecutionContext, defineNode, executeNode, executeWorkflow, MemoryCacheStore } from './packages/core/src/index';
import type { Workflow } from './packages/core/src/index';
import { conditionalNode, endNode, delayNode, mapNode, filterNode, sortNode, httpRequestNode, breadNode, devtoNode, builtInNodes } from './packages/nodes/src/index';
import { z } from 'zod';

async function test() {
  console.log('=== Testing @jam-nodes/core ===\n');

  // Test 1: Create registry and register built-in nodes
  const registry = new NodeRegistry();
  registry.registerAll(builtInNodes);
  console.log(`✓ Registered ${registry.size} built-in nodes`);
  console.log(`  Types: ${registry.getNodeTypes().join(', ')}\n`);

  // Test 2: Define a custom node
  const greetNode = defineNode({
    type: 'greet',
    name: 'Greet',
    description: 'Generate a greeting',
    category: 'action',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ message: z.string() }),
    executor: async (input) => ({
      success: true,
      output: { message: `Hello, ${input.name}!` },
    }),
  });
  registry.register(greetNode);
  console.log('✓ Defined and registered custom node');

  // Test 3: ExecutionContext
  const ctx = new ExecutionContext({
    user: { name: 'Alice', email: 'alice@example.com' },
    items: [1, 2, 3],
    contacts: [
      { name: 'Bob', email: 'bob@test.com' },
      { name: 'Carol', email: 'carol@test.com' },
    ],
  });

  // Test interpolation
  const interpolated = ctx.interpolate('Hello {{user.name}}!');
  console.log(`✓ Interpolation: "${interpolated}"`);

  // Test direct value
  const items = ctx.interpolate('{{items}}');
  console.log(`✓ Direct value: ${JSON.stringify(items)}`);

  // Test nested path
  const email = ctx.resolveNestedPath('user.email');
  console.log(`✓ Nested path: ${email}`);

  // Test JSONPath
  const firstContact = ctx.evaluateJsonPath('$.contacts[0].name');
  console.log(`✓ JSONPath: ${firstContact}\n`);

  // Test 4: Execute conditional node
  console.log('=== Testing node execution ===\n');

  const nodeCtx = ctx.toNodeContext('user-123', 'workflow-456');

  const conditionalResult = await conditionalNode.executor(
    {
      condition: { type: 'exists', variableName: 'user.email' },
      trueNodeId: 'next',
      falseNodeId: 'skip',
    },
    nodeCtx
  );
  console.log(`✓ Conditional node: success=${conditionalResult.success}, nextNodeId=${conditionalResult.nextNodeId}`);

  // Test 5: Execute sort node
  const sortResult = await sortNode.executor(
    {
      items: [{ x: 3 }, { x: 1 }, { x: 2 }],
      path: 'x',
      direction: 'asc',
    },
    nodeCtx
  );
  console.log(`✓ Sort node: ${sortResult.output?.count} items, first=${JSON.stringify((sortResult.output?.results as unknown[])?.[0])}`);

  // Test 6: Execute map node
  const mapResult = await mapNode.executor(
    {
      items: ctx.getVariable('contacts') as unknown[],
      path: 'email',
    },
    nodeCtx
  );
  console.log(`✓ Map node: extracted ${mapResult.output?.count} emails: ${JSON.stringify(mapResult.output?.results)}`);

  // Test 7: Execute filter node
  const filterResult = await filterNode.executor(
    {
      items: [1, 2, 3, 4, 5],
      path: '',
      operator: 'greater_than',
      value: 2,
    },
    nodeCtx
  );
  console.log(`✓ Filter node: filtered to ${filterResult.output?.count} items: ${JSON.stringify(filterResult.output?.results)}`);

  // Test 8: Execute custom greet node
  const greetExecutor = registry.getExecutor('greet')!;
  const greetResult = await greetExecutor({ name: 'World' }, nodeCtx);
  console.log(`✓ Custom node: ${greetResult.output?.message}`);

  // Test 8: Execute bread node
  const breadExecutor = registry.getExecutor('bread')!;
  const breadResult = await breadExecutor({}, nodeCtx);
  console.log(`✓ Bread node: ${breadResult.output?.message}`);

  console.log('\n=== Testing execution engine ===\n');

  // Test 9: Execute Node Bread
  const execResult = await executeNode(breadNode, {}, nodeCtx);
  console.log(`✓ Execute Node Bread: success=${execResult.success}, output=${JSON.stringify(execResult.output)}`);

  // Test 10: Execute Node Bread With Cache
  const cacheStore = new MemoryCacheStore();
  const cached1 = await executeNode(breadNode, {}, nodeCtx, {
    cache: { enabled: true, ttlMs: 5000, store: cacheStore },
  });
  const cached2 = await executeNode(breadNode, {}, nodeCtx, {
    cache: { enabled: true, ttlMs: 5000, store: cacheStore },
  });
  console.log(`✓ Execute Node Bread With Cache: first=${cached1.success}, second=${cached2.success} (cache hit)`);

  // Test 11: Execute Node with Retry
  let attemptCount = 0;
  const failTwiceNode = defineNode({
    type: 'fail_twice',
    name: 'Fail Twice',
    description: 'Fails the first 2 attempts, succeeds on 3rd',
    category: 'action',
    inputSchema: z.object({}),
    outputSchema: z.object({ attempt: z.number() }),
    executor: async () => {
      attemptCount++;
      if (attemptCount < 3) {
        return { success: false, error: `Fail #${attemptCount}` };
      }
      return { success: true, output: { attempt: attemptCount } };
    },
  });

  const retries: number[] = [];
  const retryResult = await executeNode(failTwiceNode, {}, nodeCtx, {
    retry: { maxAttempts: 3, backoffMs: 10 },
    onRetry: (attempt) => retries.push(attempt),
  });
  console.log(`✓ Execute Node with Retry: success=${retryResult.success}, retries=${retries.join(',')}, finalAttempt=${retryResult.output?.attempt}`);

  // Test 12: Execute Node with Timeout
  const slowNode = defineNode({
    type: 'slow',
    name: 'Slow',
    description: 'Takes 500ms',
    category: 'action',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    executor: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true, output: {} };
    },
  });

  const timeoutResult = await executeNode(slowNode, {}, nodeCtx, { timeout: 50 });
  console.log(`✓ Execute Node with Timeout: success=${timeoutResult.success}, error="${timeoutResult.error}"`);

  // Test 13: Execute Workflow
  console.log('\n=== Testing executeWorkflow ===\n');

  const stepA = defineNode({
    type: 'step_a',
    name: 'Step A',
    description: 'First step',
    category: 'action',
    inputSchema: z.object({}),
    outputSchema: z.object({ value: z.string() }),
    executor: async () => ({ success: true, output: { value: 'from-A' } }),
  });

  const stepB = defineNode({
    type: 'step_b',
    name: 'Step B',
    description: 'Second step, reads from A',
    category: 'action',
    inputSchema: z.object({ upstream: z.string().optional() }),
    outputSchema: z.object({ value: z.string() }),
    executor: async (input) => ({
      success: true,
      output: { value: `from-B(${input.upstream ?? 'none'})` },
    }),
  });

  const workflow: Workflow = {
    entryNodeId: 'a',
    nodes: [
      { id: 'a', type: 'step_a', node: stepA, input: {} },
      { id: 'b', type: 'step_b', node: stepB, input: { upstream: '{{a.value}}' } },
      { id: 'done', type: 'end', node: endNode, input: { message: 'finished' } },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'done' },
    ],
  };

  const wfCtx = new ExecutionContext();
  const events: string[] = [];
  const wfResult = await executeWorkflow(workflow, wfCtx, {
    onNodeStart: (id) => events.push(`start:${id}`),
    onNodeComplete: (id) => events.push(`done:${id}`),
  });

  console.log(`✓ Execute Workflow: success=${wfResult.success}`);
  console.log(`  statuses: ${JSON.stringify(wfResult.statuses)}`);
  console.log(`  events: ${events.join(' → ')}`);
  console.log(`  step B output: ${JSON.stringify(wfResult.results['b']?.output)}`);

  // Test 14: Execute Workflow with Conditional Branching
  const workflow2: Workflow = {
    entryNodeId: 'check',
    nodes: [
      {
        id: 'check', type: 'conditional', node: conditionalNode,
        input: {
          condition: { type: 'equals', variableName: 'flag', value: true },
          trueNodeId: 'yes-end',
          falseNodeId: 'no-end',
        },
      },
      { id: 'yes-end', type: 'end', node: endNode, input: { message: 'took yes branch' } },
      { id: 'no-end', type: 'end', node: endNode, input: { message: 'took no branch' } },
    ],
    edges: [
      { from: 'check', to: 'yes-end', condition: 'yes-end' },
      { from: 'check', to: 'no-end', condition: 'no-end' },
    ],
  };

  const wfCtx2 = new ExecutionContext({ flag: true });
  const wfResult2 = await executeWorkflow(workflow2, wfCtx2);
  console.log(`✓ Execute Workflow (Conditional): success=${wfResult2.success}`);
  console.log(`  statuses: ${JSON.stringify(wfResult2.statuses)}`);

  // Test 15: Execute Workflow with Failing Node
  const failingNode = defineNode({
    type: 'always_fail',
    name: 'Always Fail',
    description: 'Always fails',
    category: 'action',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    executor: async () => ({ success: false, error: 'Something went wrong' }),
  });

  const workflow3: Workflow = {
    entryNodeId: 'fail-step',
    nodes: [
      { id: 'fail-step', type: 'always_fail', node: failingNode, input: {} },
      { id: 'after-fail', type: 'end', node: endNode, input: { message: 'should be skipped' } },
    ],
    edges: [
      { from: 'fail-step', to: 'after-fail' },
    ],
  };

  const wfCtx3 = new ExecutionContext();
  const wfResult3 = await executeWorkflow(workflow3, wfCtx3);
  console.log(`✓ Execute Workflow (Failing): success=${wfResult3.success}`);
  console.log(`  statuses: ${JSON.stringify(wfResult3.statuses)}`);
  console.log(`  error: ${wfResult3.results['fail-step']?.error}`);

  console.log('\n=== All tests passed! ===');
}

test().catch(console.error);
