# jam-nodes-editor

A visual workflow editor for the [jam-nodes](https://github.com/wespreadjam/jam-nodes) framework. Build automation pipelines by dragging, dropping, and connecting typed nodes on a canvas.

## Quick Start

```bash
# From the repo root
npm install
npm run editor
```

Then open **http://localhost:5173** in your browser.

## What It Does

jam-nodes-editor turns the jam-nodes SDK into a visual experience. Instead of writing code to wire up nodes, you drag them onto a canvas, connect their inputs and outputs, configure parameters, and export the result as JSON.

## UI Overview

The editor has four main areas:

### 1. Node Palette (Left Sidebar)

All registered nodes appear here, grouped by category:

- 🔵 **Action** — Nodes that do things (HTTP requests, drafting emails, etc.)
- 🟣 **Logic** — Control flow (conditional branching, delays, end nodes)
- 🟢 **Integration** — External services (Reddit, Twitter, LinkedIn, SEO tools, Apollo)
- 🟠 **Transform** — Data manipulation (map, filter)

**To add a node:** Drag it from the palette onto the canvas. You can also use the search bar at the top to filter nodes by name.

### 2. Workflow Canvas (Center)

The main workspace where you build your workflow.

- **Nodes** appear as cards with colored category badges
- **Input handles** (left side) — fields the node expects as input
- **Output handles** (right side) — fields the node produces
- **Edges** — lines connecting an output handle of one node to an input handle of another

**Connecting nodes:** Click and drag from an output handle (right) to an input handle (left) on another node. The connection means "pass this output as that input."

**Selecting:** Click a node to select it and open its config panel. Click the canvas background to deselect.

**Deleting:** Select a node or edge and press `Delete` or `Backspace`.

**Panning:** Click and drag on the canvas background, or use the minimap (bottom-right).

**Zooming:** Scroll wheel, or use the +/- buttons in the bottom-left controls.

### 3. Config Panel (Right Sidebar)

When you select a node, this panel shows its configurable inputs. Fields are auto-generated from the node's Zod input schema:

- **Text fields** for strings
- **Number inputs** for numbers
- **Checkboxes** for booleans
- **Dropdowns** for enums
- **Nested sections** for objects
- **Add/remove** for arrays

If an input is connected via an edge (receiving data from another node), it shows a "Connected" badge and you don't need to fill it manually.

### 4. Toolbar (Top)

- **Workflow name** — Click to edit
- **Export JSON** — Downloads the workflow as a `.json` file
- **Import JSON** — Load a previously exported workflow
- **Undo / Redo** — Step through your edit history
- **Zoom In / Out / Fit** — Canvas zoom controls
- **Clear** — Remove all nodes and edges (with confirmation)

## Workflow JSON Format

Exported workflows follow this structure:

```json
{
  "name": "My Workflow",
  "description": "Optional description",
  "nodes": [
    {
      "id": "node_1_1234567890",
      "type": "http_request",
      "position": { "x": 300, "y": 200 },
      "config": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_abc",
      "source": "node_1_1234567890",
      "sourceHandle": "body",
      "target": "node_2_1234567891",
      "targetHandle": "input1"
    }
  ]
}
```

## Using as a Library

You can embed the editor in your own React app:

```bash
npm install jam-nodes-editor @jam-nodes/core @jam-nodes/nodes
```

```tsx
import { WorkflowEditor } from 'jam-nodes-editor';
import { NodeRegistry } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';

const registry = new NodeRegistry();
registry.registerAll(builtInNodes);

function App() {
  return (
    <WorkflowEditor
      registry={registry}
      onChange={(workflow) => console.log('Workflow updated:', workflow)}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `registry` | `NodeRegistry` | Registry with nodes to make available in the editor |
| `initialWorkflow` | `WorkflowJSON` | Optional workflow to load on mount |
| `onChange` | `(workflow: WorkflowJSON) => void` | Called whenever the workflow changes |

### Exports

```ts
import {
  WorkflowEditor,     // Main component
  NodePalette,         // Standalone palette component
  WorkflowCanvas,      // Standalone canvas component
  NodeConfigPanel,     // Standalone config panel
  WorkflowToolbar,     // Standalone toolbar
  introspectSchema,    // Zod schema → field info utility
} from 'jam-nodes-editor';

import type { WorkflowJSON, SchemaFieldInfo } from 'jam-nodes-editor';
```

## Custom Nodes

Any node registered in the `NodeRegistry` automatically appears in the editor. Define your own:

```ts
import { defineNode } from '@jam-nodes/core';
import { z } from 'zod';

const myNode = defineNode({
  type: 'my_custom_node',
  name: 'My Node',
  description: 'Does something cool',
  category: 'action',
  inputSchema: z.object({
    message: z.string().describe('The message to process'),
    count: z.number().optional().describe('How many times'),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  executor: async (input) => ({
    success: true,
    output: { result: `${input.message} x${input.count ?? 1}` },
  }),
});

registry.register(myNode);
```

The editor will automatically:
- Show it in the palette under "Action"
- Create input handles for `message` and `count`
- Create an output handle for `result`
- Generate a config form with a text field and number field

## License

MIT
