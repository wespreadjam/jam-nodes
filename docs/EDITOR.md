# Visual Editor Reference (`@jam-nodes/editor`)

## Exports

```typescript
// Components
export { WorkflowEditor } from './WorkflowEditor';
export { NodePalette } from './NodePalette';
export { WorkflowCanvas } from './WorkflowCanvas';
export { NodeConfigPanel } from './NodeConfigPanel';
export { WorkflowToolbar } from './WorkflowToolbar';
export { CustomNode } from './CustomNode';
export { ExecutionResultPanel } from './ExecutionResultPanel';

// Utilities
export { ZodSchemaIntrospector, introspectSchema } from './ZodSchemaIntrospector';
export { WorkflowRunner } from './WorkflowRunner';

// Types
export type { WorkflowJSON, WorkflowNodeJSON, WorkflowEdgeJSON, SchemaFieldInfo } from './types';
export type { CustomNodeData } from './CustomNode';
export type { NodeStatus, RunResult, StatusCallback, WorkflowRunnerOptions } from './WorkflowRunner';
```

---

## WorkflowEditor

Main component. Wraps everything in a `ReactFlowProvider`.

```typescript
interface Props {
  registry: NodeRegistry;           // Required — registered node definitions
  initialWorkflow?: WorkflowJSON;   // Optional starting workflow
  onChange?: (workflow: WorkflowJSON) => void;  // Called on every change
  storageKey?: string;              // localStorage key for auto-persistence
}
```

```tsx
import { WorkflowEditor } from '@jam-nodes/editor';
import { NodeRegistry } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';

const registry = new NodeRegistry();
registry.registerAll(builtInNodes);

<WorkflowEditor
  registry={registry}
  storageKey="my-workflow"
  onChange={(wf) => console.log('Updated:', wf)}
/>
```

### Features
- **Drag-and-drop** nodes from palette onto canvas
- **Node config panel** — auto-generates form fields from Zod input schemas
- **Undo/redo** — full history stack
- **Export/import** — download/upload workflow JSON
- **Clear** — reset canvas
- **Zoom controls** — zoom in/out/fit
- **Run/Stop** — execute workflow in-browser via `WorkflowRunner`
- **Execution visualization** — nodes show running/success/error/skipped states
- **Execution result panel** — shows outputs and errors per node

### localStorage Persistence

When `storageKey` is provided, workflows auto-save to `localStorage` under `jam-editor:{storageKey}`. On mount, stored workflow takes priority over `initialWorkflow`.

---

## WorkflowJSON Format

```typescript
interface WorkflowJSON {
  name: string;
  description?: string;
  nodes: WorkflowNodeJSON[];
  edges: WorkflowEdgeJSON[];
}

interface WorkflowNodeJSON {
  id: string;                           // Unique node ID
  type: string;                         // Node type (e.g. 'conditional')
  position: { x: number; y: number };   // Canvas position
  config: Record<string, unknown>;      // Node configuration (input values)
}

interface WorkflowEdgeJSON {
  id: string;
  source: string;        // Source node ID
  sourceHandle: string;  // Output field name
  target: string;        // Target node ID
  targetHandle: string;  // Input field name
}
```

Example:
```json
{
  "name": "My Workflow",
  "nodes": [
    { "id": "n1", "type": "http_request", "position": { "x": 100, "y": 100 }, "config": { "url": "https://api.example.com", "method": "GET" } },
    { "id": "n2", "type": "filter", "position": { "x": 400, "y": 100 }, "config": { "path": "status", "operator": "equals", "value": "active" } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "sourceHandle": "body", "target": "n2", "targetHandle": "items" }
  ]
}
```

---

## WorkflowRunner

Executes workflows programmatically. Uses topological sort (Kahn's algorithm) for execution order. Handles conditional branching via `nextNodeId`.

```typescript
class WorkflowRunner {
  constructor(registry: NodeRegistry, options?: WorkflowRunnerOptions);
  get isRunning(): boolean;
  abort(): void;
  run(workflow: WorkflowJSON): Promise<RunResult>;
}

interface WorkflowRunnerOptions {
  stopOnError?: boolean;                              // Stop on first error (default: false)
  onStatus?: (nodeId: string, status: NodeStatus) => void;  // Real-time status callback
}

interface RunResult {
  success: boolean;                        // True if no errors
  nodeStatuses: Map<string, NodeStatus>;   // Final status of each node
  totalDurationMs: number;
}

interface NodeStatus {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs?: number;
}
```

```typescript
const runner = new WorkflowRunner(registry, {
  stopOnError: true,
  onStatus: (nodeId, status) => console.log(nodeId, status.status),
});

const result = await runner.run(workflowJSON);
console.log(result.success, result.totalDurationMs);

// Abort mid-execution
runner.abort();
```

### Execution Logic
1. Topological sort of nodes based on edges
2. For each node in order:
   - Resolve inputs: static config merged with edge-connected upstream outputs
   - Execute via `registry.getExecutor(type)`
   - Store output in `ExecutionContext` for downstream nodes
   - If `nextNodeId` returned (conditional), skip non-selected branches
3. Disconnected/cycle nodes appended at end

---

## SchemaFieldInfo & ZodSchemaIntrospector

Converts Zod schemas into inspectable field metadata for auto-generating UI forms.

```typescript
interface SchemaFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'unknown';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];     // For enum types
  children?: SchemaFieldInfo[];  // For object/array types
}

function introspectSchema(schema: z.ZodTypeAny): SchemaFieldInfo[];
```

Handles `ZodOptional`, `ZodDefault`, `ZodNullable` wrappers. Recursively introspects nested objects and array item types.

---

## CustomNodeData

Data shape for React Flow nodes in the editor.

```typescript
interface CustomNodeData {
  label: string;
  category: NodeCategory;
  nodeType: string;
  inputFields: SchemaFieldInfo[];
  outputFields: SchemaFieldInfo[];
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  [key: string]: unknown;  // includes 'config'
}
```

---

## Sub-components

| Component | Purpose |
|-----------|---------|
| `NodePalette` | Sidebar listing all registered nodes by category. Drag source. |
| `WorkflowCanvas` | React Flow canvas with custom node rendering and edge handling. |
| `NodeConfigPanel` | Right panel auto-generating form fields from Zod schema introspection. |
| `WorkflowToolbar` | Top bar with name, undo/redo, zoom, import/export, run/stop. |
| `ExecutionResultPanel` | Shows per-node execution results after a run. |
| `CustomNode` | React Flow node component with handles for each input/output field. |
