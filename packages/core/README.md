# jam-nodes

Extensible workflow node framework for building automation pipelines. Define, register, and execute typed nodes with Zod validation.

📚 **[Documentation](https://docs.spreadjam.com)** · 🎮 **[Playground](https://docs.spreadjam.com/playground/overview)**

## Packages

- **[@jam-nodes/core](./packages/core)** - Core framework with types, registry, and execution context
- **[@jam-nodes/nodes](./packages/nodes)** - Built-in nodes (conditional, delay, filter, map, http-request)
- **[@jam-nodes/playground](./packages/playground)** - CLI tool for testing nodes interactively

## Installation

```bash
npm install @jam-nodes/core @jam-nodes/nodes zod
```

## Quick Start

```typescript
import { NodeRegistry, defineNode, ExecutionContext } from "@jam-nodes/core";
import { conditionalNode, endNode, builtInNodes } from "@jam-nodes/nodes";
import { z } from "zod";

// Create a registry and register built-in nodes
const registry = new NodeRegistry();
registry.registerAll(builtInNodes);

// Define a custom node
const greetNode = defineNode({
  type: "greet",
  name: "Greet",
  description: "Generate a greeting message",
  category: "action",
  inputSchema: z.object({
    name: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  executor: async (input) => ({
    success: true,
    output: { message: `Hello, ${input.name}!` },
  }),
});

// Register custom node
registry.register(greetNode);

// Execute a node
const context = new ExecutionContext({ userName: "World" });
const executor = registry.getExecutor("greet");
const result = await executor(
  { name: context.interpolate("{{userName}}") },
  context.toNodeContext("user-123", "workflow-456"),
);

console.log(result.output?.message); // "Hello, World!"
```

## Creating Custom Nodes

```typescript
import { defineNode } from "@jam-nodes/core";
import { z } from "zod";

export const myNode = defineNode({
  type: "my_custom_node",
  name: "My Custom Node",
  description: "Does something awesome",
  category: "action", // 'action' | 'logic' | 'integration' | 'transform'

  inputSchema: z.object({
    input1: z.string(),
    input2: z.number().optional(),
  }),

  outputSchema: z.object({
    result: z.string(),
  }),

  capabilities: {
    supportsRerun: true,
    supportsCancel: true,
  },

  executor: async (input, context) => {
    // Access workflow variables
    const previousData = context.resolveNestedPath("someNode.output");

    // Your logic here
    const result = `Processed: ${input.input1}`;

    return {
      success: true,
      output: { result },
      // Optional: send notification
      notification: {
        title: "Node Complete",
        message: "Processing finished",
      },
    };
  },
});
```

## Built-in Nodes

### Logic

- **conditional** - Branch workflow based on conditions
- **end** - Mark end of workflow branch
- **delay** - Wait for specified duration

### Transform

- **map** - Extract property from array items
- **filter** - Filter array based on conditions

### Examples

- **http_request** - Make HTTP requests to external APIs

## Variable Interpolation

The `ExecutionContext` supports powerful variable interpolation:

```typescript
const ctx = new ExecutionContext({
  user: { name: "Alice", email: "alice@example.com" },
  items: [1, 2, 3],
});

// Simple interpolation
ctx.interpolate("Hello {{user.name}}"); // "Hello Alice"

// Direct value (returns actual type)
ctx.interpolate("{{items}}"); // [1, 2, 3]

// JSONPath
ctx.evaluateJsonPath("$.user.email"); // "alice@example.com"
```

## License

MIT
