# jam-nodes Documentation

## What is jam-nodes?

jam-nodes is an extensible, type-safe workflow node framework for building automation pipelines in TypeScript. It provides:

- **Typed node definitions** with Zod schema validation for inputs and outputs
- **A node registry** for managing and executing workflow nodes
- **An execution context** with variable interpolation, JSONPath, and nested path resolution
- **Built-in nodes** for logic, data transformation, social monitoring, SEO, AI, and more
- **A visual workflow editor** (React + React Flow) for drag-and-drop workflow building

## Architecture

```
@jam-nodes/core     → Types, NodeRegistry, ExecutionContext, defineNode utility
@jam-nodes/nodes    → Built-in node definitions (logic, transform, AI, integrations)
@jam-nodes/editor   → React visual editor, WorkflowRunner, schema introspection
```

**core** is dependency-free (except Zod + jsonpath-plus). **nodes** depends on core. **editor** depends on core + React + @xyflow/react.

## Quick Start

```bash
npm install @jam-nodes/core @jam-nodes/nodes zod
```

```typescript
import { NodeRegistry, ExecutionContext } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';

const registry = new NodeRegistry();
registry.registerAll(builtInNodes);

const ctx = new ExecutionContext({ userName: 'World' });
const executor = registry.getExecutor('greet');
const result = await executor(
  { name: ctx.interpolate('{{userName}}') },
  ctx.toNodeContext('user-123', 'wf-456')
);
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [CORE.md](./CORE.md) | Core framework reference — types, registry, execution context, utilities |
| [NODES.md](./NODES.md) | Built-in nodes reference — every node with full input/output schemas |
| [EDITOR.md](./EDITOR.md) | Visual editor reference — components, WorkflowRunner, JSON format |
| [CREATING-NODES.md](./CREATING-NODES.md) | Guide for creating custom nodes |
