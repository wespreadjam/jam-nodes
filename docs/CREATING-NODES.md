# Creating Custom Nodes

## Step-by-Step Guide

### 1. Define Input/Output Schemas with Zod

```typescript
import { z } from 'zod';

const MyInputSchema = z.object({
  query: z.string(),
  limit: z.number().min(1).max(100).default(10),
  includeMetadata: z.boolean().optional(),
});

const MyOutputSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    title: z.string(),
    score: z.number(),
  })),
  totalCount: z.number(),
});
```

**Schema Design Tips:**
- Use `.optional()` for non-required fields
- Use `.default(value)` for defaults (rendered as optional in UI)
- Use `.nullable()` for fields that can be null
- Use `z.enum([...])` for dropdowns in the editor
- Add `.describe('...')` for field descriptions (used by schema introspector)
- Nested `z.object()` creates collapsible sections in the config panel
- `z.array(z.unknown())` for generic array inputs (common for transform nodes)

### 2. Create the Node with defineNode

```typescript
import { defineNode } from '@jam-nodes/core';

export const mySearchNode = defineNode({
  type: 'my_search',           // Unique identifier — used in workflows
  name: 'My Search',           // Display name in editor
  description: 'Search for items matching a query',
  category: 'integration',     // 'action' | 'logic' | 'integration' | 'transform'

  inputSchema: MyInputSchema,
  outputSchema: MyOutputSchema,

  estimatedDuration: 10,       // Seconds — shown in UI

  capabilities: {
    supportsRerun: true,       // Can be re-executed
    supportsCancel: true,      // Supports abort
    supportsEnrichment: false,
    supportsBulkActions: false,
    supportsApproval: false,
  },

  executor: async (input, context) => {
    // input is fully typed as z.infer<typeof MyInputSchema>
    // context is NodeExecutionContext

    try {
      // Your logic here
      const results = await doSearch(input.query, input.limit);

      return {
        success: true,
        output: {               // Must match MyOutputSchema
          results,
          totalCount: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
});
```

### 3. Using ExecutionContext in Executors

The `context` parameter provides:

```typescript
executor: async (input, context) => {
  // User and workflow info
  context.userId;                    // Who is running this
  context.campaignId;                // Optional project context
  context.workflowExecutionId;       // Unique run ID

  // Access upstream node outputs
  const prevData = context.variables['previousNodeId'];
  const nested = context.resolveNestedPath('contacts[0].email');

  // Use injected services
  if (context.services?.anthropic) {
    const text = await context.services.anthropic.generateText({
      prompt: 'Generate something',
      model: 'claude-sonnet-4-20250514',
    });
  }

  // Return with optional features
  return {
    success: true,
    output: { /* ... */ },

    // Conditional branching (for logic nodes)
    nextNodeId: someCondition ? 'nodeA' : 'nodeB',

    // Request approval before continuing
    needsApproval: {
      resourceIds: ['id1', 'id2'],
      resourceType: 'email_draft',
      message: 'Please review these drafts',
    },

    // Send notification
    notification: {
      title: 'Node Complete',
      message: 'Found 42 results',
      data: { count: 42 },
    },
  };
}
```

### 4. Categories

| Category | Use For |
|----------|---------|
| `action` | AI generation, email drafting, content creation |
| `logic` | Conditionals, delays, flow control, end markers |
| `integration` | External APIs (HTTP, Apollo, DataForSEO, social platforms) |
| `transform` | Data manipulation (map, filter, reshape) |

### 5. Services Integration

Nodes access external services via `context.services`. Always check availability:

```typescript
if (!context.services?.apollo) {
  return { success: false, error: 'Apollo service not configured.' };
}
const contacts = await context.services.apollo.searchContacts({ ... });
```

Available services: `apollo`, `dataForSeo`, `twitter`, `forumScout`, `openai`, `anthropic`, `notifications`, `storage`, `cache`, `emailDrafts`, `analyzedPosts`.

Host applications inject implementations when creating the execution context.

### 6. Register with the Editor

```typescript
import { NodeRegistry } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { mySearchNode } from './my-search-node';

const registry = new NodeRegistry();
registry.registerAll(builtInNodes);
registry.register(mySearchNode);

// Pass to editor
<WorkflowEditor registry={registry} />
```

The editor auto-generates:
- **Palette entry** with node name, category, and description
- **Config panel** form fields from your Zod input schema
- **Node handles** (connection ports) for each input and output field

### 7. Testing Nodes

```typescript
import { createExecutionContext } from '@jam-nodes/core';
import { mySearchNode } from './my-search-node';

// Unit test
const ctx = createExecutionContext({ previousData: 'hello' });
const nodeContext = ctx.toNodeContext('test-user', 'test-run');
nodeContext.services = { /* mock services */ } as any;

const result = await mySearchNode.executor(
  { query: 'test', limit: 5 },
  nodeContext
);

expect(result.success).toBe(true);
expect(result.output?.totalCount).toBeGreaterThan(0);

// Schema validation
const validated = mySearchNode.inputSchema.parse({ query: 'test' });
expect(() => mySearchNode.inputSchema.parse({})).toThrow(); // missing required 'query'
```

### 8. File Organization Convention

```
packages/nodes/src/
  my-category/
    my-node.ts          # Node definition + schemas
    index.ts            # Re-exports
  index.ts              # Add to builtInNodes array + re-export
```

For AI nodes with prompts, separate concerns:
```
schemas/ai.ts           # Zod schemas shared between nodes
prompts/my-node.ts      # Prompt templates and helpers
ai/my-node.ts           # Node definition using schemas + prompts
```
