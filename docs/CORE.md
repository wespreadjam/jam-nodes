# Core Framework Reference (`@jam-nodes/core`)

## Exports

```typescript
// Types
export type {
  NodeExecutionContext, NodeExecutionResult, NodeExecutor, NodeApprovalRequest,
  NodeCapabilities, NodeCategory, NodeMetadata, NodeDefinition,
  NodeApprovalConfig, NodeNotificationConfig, BaseNodeConfig,
  NodeServices, ApolloClient, ApolloContact, DataForSeoClient, DataForSeoAuditResult,
  DataForSeoKeyword, TwitterClient, TwitterPost, ForumScoutClient, LinkedInPost,
  OpenAIClient, AnthropicClient, NotificationService, StorageService, CacheService,
  EmailDraftsService, EmailDraft, AnalyzedPostsStorage, AnalyzedPostData,
};

// Classes & functions
export { ExecutionContext, createExecutionContext, prepareNodeInput };
export { NodeRegistry, createRegistry };
export { defineNode };
export type { DefineNodeConfig };
```

---

## Types

### NodeCategory

```typescript
type NodeCategory = 'action' | 'logic' | 'integration' | 'transform';
```

### NodeCapabilities

```typescript
interface NodeCapabilities {
  supportsEnrichment?: boolean;
  supportsBulkActions?: boolean;
  supportsApproval?: boolean;
  supportsRerun?: boolean;
  supportsCancel?: boolean;
}
```

### NodeMetadata

Client-safe metadata (no executor). Used for UI rendering.

```typescript
interface NodeMetadata {
  type: string;
  name: string;
  description: string;
  category: NodeCategory;
  estimatedDuration?: number;
  capabilities?: NodeCapabilities;
}
```

### NodeExecutionContext

Passed to every node executor.

```typescript
interface NodeExecutionContext {
  userId: string;
  campaignId?: string;
  workflowExecutionId: string;
  variables: Record<string, unknown>;
  resolveNestedPath: (path: string) => unknown;
  services?: NodeServices;
}
```

### NodeExecutionResult\<TOutput\>

Returned by every node executor.

```typescript
interface NodeExecutionResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  nextNodeId?: string;                // For conditional branching
  needsApproval?: NodeApprovalRequest;
  notification?: { title: string; message: string; data?: Record<string, unknown> };
}
```

### NodeApprovalRequest

```typescript
interface NodeApprovalRequest {
  resourceIds: string[];
  resourceType: string;
  message?: string;
  detailComponent?: string;
}
```

### NodeExecutor\<TInput, TOutput\>

```typescript
type NodeExecutor<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: NodeExecutionContext
) => Promise<NodeExecutionResult<TOutput>>;
```

### NodeDefinition\<TInput, TOutput\>

Complete node definition. Extends `NodeMetadata`.

```typescript
interface NodeDefinition<TInput = unknown, TOutput = unknown> extends NodeMetadata {
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  executor: NodeExecutor<TInput, TOutput>;
}
```

### BaseNodeConfig / NodeApprovalConfig / NodeNotificationConfig

Optional config any node can include for approval and notification features.

```typescript
interface BaseNodeConfig {
  approval?: NodeApprovalConfig;
  notification?: NodeNotificationConfig;
}

interface NodeApprovalConfig {
  required: boolean;
  pauseWorkflow?: boolean;       // default: true
  timeoutMinutes?: number;       // default: 1440 (24h)
  approvalType?: string;
  message?: string;
}

interface NodeNotificationConfig {
  enabled: boolean;
  channels?: Array<'chat' | 'email' | 'slack' | 'webhook'>;
  message?: string;
  priority?: 'low' | 'medium' | 'high';
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;
}
```

### NodeServices

All optional. Host applications inject implementations via `context.services`.

```typescript
interface NodeServices {
  apollo?: ApolloClient;
  dataForSeo?: DataForSeoClient;
  twitter?: TwitterClient;
  forumScout?: ForumScoutClient;
  openai?: OpenAIClient;
  anthropic?: AnthropicClient;
  notifications?: NotificationService;
  storage?: StorageService;
  cache?: CacheService;
  emailDrafts?: EmailDraftsService;
  analyzedPosts?: AnalyzedPostsStorage;
}
```

#### Service Interfaces

| Service | Key Methods |
|---------|------------|
| `ApolloClient` | `searchContacts(params)`, `enrichContact(contactId)` |
| `DataForSeoClient` | `getOnPageInstant(url, options?)`, `getRelatedKeywords(keywords, options?)` |
| `TwitterClient` | `searchTweets(query, options?)` |
| `ForumScoutClient` | `searchLinkedIn(keywords, options?)` |
| `OpenAIClient` | `generateVideo(params)`, `generateImage(params)` |
| `AnthropicClient` | `generateText(params)`, `generateStructured<T>(params)` |
| `NotificationService` | `send(params)` |
| `EmailDraftsService` | `createDraft(params)` |
| `AnalyzedPostsStorage` | `storePosts(params)` |
| `StorageService` | `save<T>(key, data)`, `get<T>(key)`, `delete(key)` |
| `CacheService` | `get<T>(key)`, `set<T>(key, value, ttlSeconds?)`, `delete(key)` |

---

## NodeRegistry

Manages node definitions. Generic over node type strings.

```typescript
const registry = new NodeRegistry<'conditional' | 'end' | 'custom'>();
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `register<TInput, TOutput>(definition: NodeDefinition<TInput, TOutput>): this` | Register a node. Throws if type already registered. |
| `registerAll` | `registerAll(definitions: NodeDefinition[]): this` | Register multiple nodes at once. |
| `unregister` | `unregister(type): boolean` | Remove a registered node type. Returns true if it existed. |
| `has` | `has(type): boolean` | Check if a type is registered. |
| `getDefinition` | `getDefinition(type): NodeDefinition \| undefined` | Get full definition including executor. |
| `getMetadata` | `getMetadata(type): NodeMetadata \| undefined` | Get client-safe metadata (no executor). |
| `getExecutor` | `getExecutor(type): NodeExecutor \| undefined` | Get just the executor function. |
| `getNodeTypes` | `getNodeTypes(): string[]` | Get all registered type identifiers. |
| `getAllDefinitions` | `getAllDefinitions(): NodeDefinition[]` | Get all definitions. |
| `getAllMetadata` | `getAllMetadata(): NodeMetadata[]` | Get all metadata. |
| `getByCategory` | `getByCategory(category: NodeCategory): NodeDefinition[]` | Filter definitions by category. |
| `getMetadataByCategory` | `getMetadataByCategory(category): NodeMetadata[]` | Filter metadata by category. |
| `validateInput` | `validateInput<TInput>(type, input): TInput` | Validate input against node's Zod schema. Throws ZodError. |
| `validateOutput` | `validateOutput<TOutput>(type, output): TOutput` | Validate output against node's Zod schema. Throws ZodError. |
| `size` | `get size(): number` | Number of registered nodes. |

```typescript
// Example
const registry = new NodeRegistry();
registry.registerAll(builtInNodes);

const def = registry.getDefinition('conditional');
const executor = registry.getExecutor('filter');
const logicNodes = registry.getByCategory('logic');
const validated = registry.validateInput('delay', { durationMs: 5000 });
```

**Factory function:** `createRegistry<TNodeType>()` — creates a new empty `NodeRegistry`.

---

## ExecutionContext

Manages workflow variables, interpolation, JSONPath evaluation, and node output storage.

### Constructor

```typescript
new ExecutionContext(initialVariables?: Record<string, unknown>)
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setVariable` | `(name: string, value: unknown): void` | Set a variable. |
| `getVariable` | `(name: string): unknown` | Get a variable value. |
| `getAllVariables` | `(): Record<string, unknown>` | Get copy of all variables. |
| `hasVariable` | `(name: string): boolean` | Check if variable exists. |
| `deleteVariable` | `(name: string): void` | Delete a variable. |
| `clearAll` | `(): void` | Clear all variables. |
| `mergeVariables` | `(vars: Record<string, unknown>): void` | Merge multiple variables. |
| `evaluateJsonPath` | `(path: string): unknown` | Evaluate JSONPath against variables. Single results unwrapped. |
| `interpolate` | `(template: string): unknown` | Interpolate `{{var}}` in strings. Single references return actual value. |
| `interpolateObject` | `<T>(obj: T): T` | Recursively interpolate all strings in an object/array. |
| `resolveNestedPath` | `(path: string): unknown` | Resolve dot notation like `contact.email` or `data[0].name`. |
| `storeNodeOutput` | `(nodeId: string, output: unknown): void` | Store output under nodeId and merge object keys to root. |
| `getNodeOutput` | `<T>(nodeId: string): T \| undefined` | Get a node's stored output. |
| `toNodeContext` | `(userId, workflowExecutionId, campaignId?): NodeExecutionContext` | Create context for executor use. |
| `toJSON` | `(): Record<string, unknown>` | Export variables. |
| `static fromJSON` | `(json): ExecutionContext` | Create from serialized variables. |

```typescript
const ctx = new ExecutionContext({ user: { name: 'Alice' }, items: [1, 2, 3] });

ctx.interpolate('Hello {{user.name}}');        // "Hello Alice"
ctx.interpolate('{{items}}');                   // [1, 2, 3] (actual array)
ctx.evaluateJsonPath('$.user.name');            // "Alice"
ctx.resolveNestedPath('user.name');             // "Alice"

ctx.storeNodeOutput('search', { contacts: [{name: 'Bob'}] });
ctx.getVariable('contacts');                    // [{name: 'Bob'}]
ctx.getNodeOutput('search');                    // { contacts: [{name: 'Bob'}] }
```

### Factory Functions

- `createExecutionContext(input?)` — creates `new ExecutionContext(input || {})`
- `prepareNodeInput<T>(nodeSettings, context)` — calls `context.interpolateObject(nodeSettings)`, resolving all `{{var}}` references in node config

---

## defineNode

Type-safe helper for creating node definitions.

```typescript
function defineNode<TInput, TOutput>(config: DefineNodeConfig<TInput, TOutput>): NodeDefinition<TInput, TOutput>
```

```typescript
interface DefineNodeConfig<TInput, TOutput> {
  type: string;
  name: string;
  description: string;
  category: NodeCategory;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  executor: NodeExecutor<TInput, TOutput>;
  estimatedDuration?: number;
  capabilities?: NodeCapabilities;
}
```

```typescript
import { defineNode } from '@jam-nodes/core';
import { z } from 'zod';

export const myNode = defineNode({
  type: 'my_node',
  name: 'My Node',
  description: 'Does something',
  category: 'action',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  executor: async (input) => ({
    success: true,
    output: { result: `Processed: ${input.message}` },
  }),
});
```
