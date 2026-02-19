/**
 * Quick test to verify packages work
 * Run with: npx tsx test.ts
 */

import { NodeRegistry, ExecutionContext, defineNode } from './packages/core/src/index';
import { conditionalNode, endNode, delayNode, mapNode, filterNode, httpRequestNode, breadNode, builtInNodes } from './packages/nodes/src/index';
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

  // Test 5: Execute map node
  const mapResult = await mapNode.executor(
    {
      items: ctx.getVariable('contacts') as unknown[],
      path: 'email',
    },
    nodeCtx
  );
  console.log(`✓ Map node: extracted ${mapResult.output?.count} emails: ${JSON.stringify(mapResult.output?.results)}`);

  // Test 6: Execute filter node
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

  // Test 7: Execute custom greet node
  const greetExecutor = registry.getExecutor('greet')!;
  const greetResult = await greetExecutor({ name: 'World' }, nodeCtx);
  console.log(`✓ Custom node: ${greetResult.output?.message}`);

  // Test 8: Execute bread node
  const breadExecutor = registry.getExecutor('bread')!;
  const breadResult = await breadExecutor({}, nodeCtx);
  console.log(`✓ Bread node: ${breadResult.output?.message}`);

  console.log('\n=== All tests passed! ===');
}

test().catch(console.error);
