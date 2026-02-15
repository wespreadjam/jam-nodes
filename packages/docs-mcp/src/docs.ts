// Bundled jam-nodes documentation content

export interface DocSection {
  id: string;
  title: string;
  content: string;
  source: string;
  keywords: string[];
}

// --- Raw doc content ---

export const README_DOC = `# jam-nodes Documentation

## What is jam-nodes?

jam-nodes is an extensible, type-safe workflow node framework for building automation pipelines in TypeScript. It provides:

- **Typed node definitions** with Zod schema validation for inputs and outputs
- **A node registry** for managing and executing workflow nodes
- **An execution context** with variable interpolation, JSONPath, and nested path resolution
- **Built-in nodes** for logic, data transformation, social monitoring, SEO, AI, and more
- **A visual workflow editor** (React + React Flow) for drag-and-drop workflow building

## Architecture

\`\`\`
@jam-nodes/core     → Types, NodeRegistry, ExecutionContext, defineNode utility
@jam-nodes/nodes    → Built-in node definitions (logic, transform, AI, integrations)
@jam-nodes/editor   → React visual editor, WorkflowRunner, schema introspection
\`\`\`

**core** is dependency-free (except Zod + jsonpath-plus). **nodes** depends on core. **editor** depends on core + React + @xyflow/react.

## Quick Start

\`\`\`bash
npm install @jam-nodes/core @jam-nodes/nodes zod
\`\`\`

\`\`\`typescript
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
\`\`\``;

export const CORE_DOC = `# Core Framework Reference (\`@jam-nodes/core\`)

## Exports

\`\`\`typescript
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
\`\`\`

---

## Types

### NodeCategory

\`\`\`typescript
type NodeCategory = 'action' | 'logic' | 'integration' | 'transform';
\`\`\`

### NodeCapabilities

\`\`\`typescript
interface NodeCapabilities {
  supportsEnrichment?: boolean;
  supportsBulkActions?: boolean;
  supportsApproval?: boolean;
  supportsRerun?: boolean;
  supportsCancel?: boolean;
}
\`\`\`

### NodeMetadata

Client-safe metadata (no executor). Used for UI rendering.

\`\`\`typescript
interface NodeMetadata {
  type: string;
  name: string;
  description: string;
  category: NodeCategory;
  estimatedDuration?: number;
  capabilities?: NodeCapabilities;
}
\`\`\`

### NodeExecutionContext

Passed to every node executor.

\`\`\`typescript
interface NodeExecutionContext {
  userId: string;
  campaignId?: string;
  workflowExecutionId: string;
  variables: Record<string, unknown>;
  resolveNestedPath: (path: string) => unknown;
  services?: NodeServices;
}
\`\`\`

### NodeExecutionResult<TOutput>

Returned by every node executor.

\`\`\`typescript
interface NodeExecutionResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  nextNodeId?: string;
  needsApproval?: NodeApprovalRequest;
  notification?: { title: string; message: string; data?: Record<string, unknown> };
}
\`\`\`

### NodeApprovalRequest

\`\`\`typescript
interface NodeApprovalRequest {
  resourceIds: string[];
  resourceType: string;
  message?: string;
  detailComponent?: string;
}
\`\`\`

### NodeExecutor<TInput, TOutput>

\`\`\`typescript
type NodeExecutor<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: NodeExecutionContext
) => Promise<NodeExecutionResult<TOutput>>;
\`\`\`

### NodeDefinition<TInput, TOutput>

Complete node definition. Extends \`NodeMetadata\`.

\`\`\`typescript
interface NodeDefinition<TInput = unknown, TOutput = unknown> extends NodeMetadata {
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  executor: NodeExecutor<TInput, TOutput>;
}
\`\`\`

### BaseNodeConfig / NodeApprovalConfig / NodeNotificationConfig

\`\`\`typescript
interface BaseNodeConfig {
  approval?: NodeApprovalConfig;
  notification?: NodeNotificationConfig;
}

interface NodeApprovalConfig {
  required: boolean;
  pauseWorkflow?: boolean;
  timeoutMinutes?: number;
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
\`\`\`

### NodeServices

All optional. Host applications inject implementations via \`context.services\`.

\`\`\`typescript
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
\`\`\`

---

## NodeRegistry

Manages node definitions. Generic over node type strings.

### Methods

| Method | Description |
|--------|-------------|
| \`register(definition)\` | Register a node. Throws if type already registered. |
| \`registerAll(definitions)\` | Register multiple nodes at once. |
| \`unregister(type)\` | Remove a registered node type. |
| \`has(type)\` | Check if a type is registered. |
| \`getDefinition(type)\` | Get full definition including executor. |
| \`getMetadata(type)\` | Get client-safe metadata (no executor). |
| \`getExecutor(type)\` | Get just the executor function. |
| \`getNodeTypes()\` | Get all registered type identifiers. |
| \`getAllDefinitions()\` | Get all definitions. |
| \`getAllMetadata()\` | Get all metadata. |
| \`getByCategory(category)\` | Filter definitions by category. |
| \`validateInput(type, input)\` | Validate input against node's Zod schema. |
| \`validateOutput(type, output)\` | Validate output against node's Zod schema. |
| \`size\` | Number of registered nodes. |

**Factory function:** \`createRegistry<TNodeType>()\` — creates a new empty \`NodeRegistry\`.

---

## ExecutionContext

Manages workflow variables, interpolation, JSONPath evaluation, and node output storage.

### Methods

| Method | Description |
|--------|-------------|
| \`setVariable(name, value)\` | Set a variable. |
| \`getVariable(name)\` | Get a variable value. |
| \`getAllVariables()\` | Get copy of all variables. |
| \`hasVariable(name)\` | Check if variable exists. |
| \`deleteVariable(name)\` | Delete a variable. |
| \`clearAll()\` | Clear all variables. |
| \`mergeVariables(vars)\` | Merge multiple variables. |
| \`evaluateJsonPath(path)\` | Evaluate JSONPath against variables. |
| \`interpolate(template)\` | Interpolate \`{{var}}\` in strings. |
| \`interpolateObject(obj)\` | Recursively interpolate all strings in an object/array. |
| \`resolveNestedPath(path)\` | Resolve dot notation paths. |
| \`storeNodeOutput(nodeId, output)\` | Store output under nodeId. |
| \`getNodeOutput(nodeId)\` | Get a node's stored output. |
| \`toNodeContext(userId, workflowExecutionId, campaignId?)\` | Create context for executor use. |
| \`toJSON()\` | Export variables. |
| \`static fromJSON(json)\` | Create from serialized variables. |

---

## defineNode

Type-safe helper for creating node definitions.

\`\`\`typescript
function defineNode<TInput, TOutput>(config: DefineNodeConfig<TInput, TOutput>): NodeDefinition<TInput, TOutput>
\`\`\`

\`\`\`typescript
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
    output: { result: \\\`Processed: \\\${input.message}\\\` },
  }),
});
\`\`\``;

export const NODES_DOC = `# Built-in Nodes Reference (\`@jam-nodes/nodes\`)

All built-in nodes are exported individually and as \`builtInNodes\` array for bulk registration.

## Logic Nodes

### conditional
Branch workflow based on a condition.
- **Category:** logic
- **Capabilities:** supportsRerun
- **Input:** condition (type, variableName, value), trueNodeId, falseNodeId
- **Output:** conditionMet (boolean), selectedBranch ('true'|'false')

### end
Mark the end of a workflow branch.
- **Category:** logic
- **Input:** message (optional)
- **Output:** completed (always true), message

### delay
Pause workflow execution for a specified duration.
- **Category:** logic
- **Capabilities:** supportsCancel
- **Input:** durationMs (0-3600000), message (optional)
- **Output:** waited (true), actualDurationMs, message

## Transform Nodes

### map
Extract a property from each item in an array.
- **Category:** transform
- **Capabilities:** supportsRerun
- **Input:** items (array), path (dot notation string)
- **Output:** results (array), count

### filter
Filter items in an array based on a condition.
- **Category:** transform
- **Capabilities:** supportsRerun
- **Input:** items (array), path (string), operator (equals|not_equals|contains|not_contains|greater_than|less_than|exists|not_exists), value (optional)
- **Output:** results (array), count, originalCount

## Example Nodes

### http_request
Make HTTP requests to external APIs.
- **Category:** integration
- **Estimated Duration:** 5s
- **Capabilities:** supportsRerun, supportsCancel
- **Input:** url (required), method (GET|POST|PUT|PATCH|DELETE), headers, body, timeout (default 30000)
- **Output:** status, statusText, headers, body, ok, durationMs

## Integration Nodes

### reddit_monitor
Search Reddit for posts matching keywords. No authentication required.
- **Category:** integration
- **Estimated Duration:** 20s
- **Capabilities:** supportsRerun
- **Input:** keywords (required), timeFilter (hour|day|week|month|year|all), sortBy, maxResults (max 100)
- **Output:** posts (RedditPost[]), totalFound, subredditsSearched

### twitter_monitor
Search Twitter/X for posts matching keywords.
- **Category:** integration
- **Estimated Duration:** 15s
- **Capabilities:** supportsRerun
- **Services:** Required: twitter
- **Input:** keywords (required), excludeRetweets, minLikes, maxResults, lang, sinceDays
- **Output:** posts (TwitterPost[]), totalFound, hasMore, cursor

### linkedin_monitor
Search LinkedIn for posts via ForumScout API.
- **Category:** integration
- **Estimated Duration:** 60s
- **Capabilities:** supportsRerun
- **Services:** Required: forumScout
- **Input:** keywords (required), timeFilter, maxResults
- **Output:** posts (LinkedInPost[]), totalFound

### sora_video
Generate AI video using OpenAI Sora 2.
- **Category:** integration
- **Estimated Duration:** 60s
- **Services:** Required: openai
- **Input:** prompt (required), model (sora-2|sora-2-pro), seconds (4|8|12), size
- **Output:** video ({url, durationSeconds, size, model}), processingTimeSeconds

### seo_keyword_research
Research keywords with search volume, difficulty, CPC, and intent data.
- **Category:** integration
- **Estimated Duration:** 10s
- **Services:** Required: dataForSeo
- **Input:** seedKeywords (required), locationCode, languageCode, limit
- **Output:** keywords (array), totalResearched

### seo_audit
Run comprehensive SEO audit on a URL.
- **Category:** integration
- **Estimated Duration:** 30s
- **Services:** Required: dataForSeo
- **Input:** url (optional, can come from context variables)
- **Output:** overallScore, issues, passedAudits, failedAudits, url, meta, performance, links, resources, content, extractedKeywords

### search_contacts
Search for contacts using Apollo.io with email enrichment.
- **Category:** integration
- **Estimated Duration:** 5s
- **Capabilities:** supportsEnrichment, supportsBulkActions, supportsRerun
- **Services:** Required: apollo
- **Input:** personTitles, personLocations, organizationLocations, employeeRanges, keywords, limit, includeSimilarTitles, personSeniorities, technologies, industryTagIds, departments
- **Output:** contacts (array), totalFound

## AI Nodes

### social_keyword_generator
Generate platform-specific search keywords from a topic using Claude.
- **Category:** action
- **Estimated Duration:** 15s
- **Services:** Required: anthropic
- **Input:** topic (required), userKeywords (optional)
- **Output:** topic, twitter, reddit, linkedin, allKeywords

### draft_emails
Generate personalized email drafts for contacts using Claude.
- **Category:** action
- **Estimated Duration:** 30s
- **Services:** Required: anthropic, emailDrafts
- **Input:** contacts (required), productDescription (required), emailTemplate, subject, approval
- **Output:** emails (DraftEmailInfo[]), draftedCount

### social_ai_analyze
Analyze social media posts for relevance, sentiment, complaints, and urgency using Claude.
- **Category:** action
- **Estimated Duration:** 60s
- **Services:** Required: anthropic
- **Input:** twitterPosts, redditPosts, linkedinPosts, posts, topic (required), userIntent (required), monitoringConfigId
- **Output:** analyzedPosts, highPriorityPosts, complaints, totalAnalyzed, highPriorityCount, complaintCount, averageRelevance`;

export const EDITOR_DOC = `# Visual Editor Reference (\`@jam-nodes/editor\`)

## WorkflowEditor

Main component. Wraps everything in a ReactFlowProvider.

Props:
- registry: NodeRegistry (required)
- initialWorkflow?: WorkflowJSON
- onChange?: (workflow: WorkflowJSON) => void
- storageKey?: string (localStorage key for auto-persistence)

### Features
- Drag-and-drop nodes from palette onto canvas
- Node config panel — auto-generates form fields from Zod input schemas
- Undo/redo — full history stack
- Export/import — download/upload workflow JSON
- Clear — reset canvas
- Zoom controls
- Run/Stop — execute workflow in-browser via WorkflowRunner
- Execution visualization — nodes show running/success/error/skipped states
- Execution result panel — shows outputs and errors per node

### localStorage Persistence
When storageKey is provided, workflows auto-save to localStorage under \`jam-editor:{storageKey}\`.

## WorkflowJSON Format

\`\`\`typescript
interface WorkflowJSON {
  name: string;
  description?: string;
  nodes: WorkflowNodeJSON[];
  edges: WorkflowEdgeJSON[];
}

interface WorkflowNodeJSON {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

interface WorkflowEdgeJSON {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}
\`\`\`

## WorkflowRunner

Executes workflows programmatically. Uses topological sort (Kahn's algorithm).

\`\`\`typescript
class WorkflowRunner {
  constructor(registry: NodeRegistry, options?: WorkflowRunnerOptions);
  get isRunning(): boolean;
  abort(): void;
  run(workflow: WorkflowJSON): Promise<RunResult>;
}
\`\`\`

Options: stopOnError (boolean), onStatus callback.

RunResult: success, nodeStatuses (Map), totalDurationMs.

### Execution Logic
1. Topological sort of nodes based on edges
2. For each node: resolve inputs, execute, store output
3. If nextNodeId returned (conditional), skip non-selected branches
4. Disconnected/cycle nodes appended at end

## ZodSchemaIntrospector

Converts Zod schemas into inspectable field metadata for auto-generating UI forms.

\`\`\`typescript
interface SchemaFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'unknown';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];
  children?: SchemaFieldInfo[];
}

function introspectSchema(schema: z.ZodTypeAny): SchemaFieldInfo[];
\`\`\`

## Sub-components

| Component | Purpose |
|-----------|---------|
| NodePalette | Sidebar listing all registered nodes by category |
| WorkflowCanvas | React Flow canvas with custom node rendering |
| NodeConfigPanel | Right panel auto-generating form fields from Zod schemas |
| WorkflowToolbar | Top bar with name, undo/redo, zoom, import/export, run/stop |
| ExecutionResultPanel | Shows per-node execution results after a run |
| CustomNode | React Flow node component with handles for each I/O field |`;

export const CREATING_NODES_DOC = `# Creating Custom Nodes

## Step-by-Step Guide

### 1. Define Input/Output Schemas with Zod

\`\`\`typescript
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
\`\`\`

**Schema Design Tips:**
- Use .optional() for non-required fields
- Use .default(value) for defaults
- Use .nullable() for fields that can be null
- Use z.enum([...]) for dropdowns in the editor
- Add .describe('...') for field descriptions
- Nested z.object() creates collapsible sections in the config panel

### 2. Create the Node with defineNode

\`\`\`typescript
import { defineNode } from '@jam-nodes/core';

export const mySearchNode = defineNode({
  type: 'my_search',
  name: 'My Search',
  description: 'Search for items matching a query',
  category: 'integration',
  inputSchema: MyInputSchema,
  outputSchema: MyOutputSchema,
  estimatedDuration: 10,
  capabilities: { supportsRerun: true, supportsCancel: true },
  executor: async (input, context) => {
    try {
      const results = await doSearch(input.query, input.limit);
      return { success: true, output: { results, totalCount: results.length } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
    }
  },
});
\`\`\`

### 3. Using ExecutionContext in Executors

The context parameter provides:
- userId, campaignId, workflowExecutionId
- variables (upstream node outputs)
- resolveNestedPath for dot notation access
- services (injected by host application)

### 4. Categories

| Category | Use For |
|----------|---------|
| action | AI generation, email drafting, content creation |
| logic | Conditionals, delays, flow control, end markers |
| integration | External APIs (HTTP, Apollo, DataForSEO, social platforms) |
| transform | Data manipulation (map, filter, reshape) |

### 5. Services Integration

Always check availability before using services:
\`\`\`typescript
if (!context.services?.apollo) {
  return { success: false, error: 'Apollo service not configured.' };
}
\`\`\`

Available services: apollo, dataForSeo, twitter, forumScout, openai, anthropic, notifications, storage, cache, emailDrafts, analyzedPosts.

### 6. Register with the Editor

\`\`\`typescript
const registry = new NodeRegistry();
registry.registerAll(builtInNodes);
registry.register(mySearchNode);

<WorkflowEditor registry={registry} />
\`\`\`

### 7. Testing Nodes

\`\`\`typescript
const ctx = createExecutionContext({ previousData: 'hello' });
const nodeContext = ctx.toNodeContext('test-user', 'test-run');
const result = await mySearchNode.executor({ query: 'test', limit: 5 }, nodeContext);
expect(result.success).toBe(true);
\`\`\`

### 8. File Organization Convention

\`\`\`
packages/nodes/src/
  my-category/
    my-node.ts
    index.ts
  index.ts
\`\`\``;

// --- Section parsing ---

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[`#|{}\[\]()]/g, ' ')
    .replace(/[^a-z0-9_\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return [...new Set(words)];
}

function parseSections(content: string, source: string): DocSection[] {
  const lines = content.split('\n');
  const sections: DocSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      if (currentTitle || currentContent.length > 0) {
        const body = currentContent.join('\n').trim();
        if (body) {
          sections.push({
            id: `${source}-${sectionIndex}`,
            title: currentTitle || source,
            content: body,
            source,
            keywords: extractKeywords(`${currentTitle} ${body}`),
          });
          sectionIndex++;
        }
      }
      currentTitle = headingMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle || currentContent.length > 0) {
    const body = currentContent.join('\n').trim();
    if (body) {
      sections.push({
        id: `${source}-${sectionIndex}`,
        title: currentTitle || source,
        content: body,
        source,
        keywords: extractKeywords(`${currentTitle} ${body}`),
      });
    }
  }

  return sections;
}

// --- Node info by type ---

export interface NodeInfo {
  type: string;
  name: string;
  category: string;
  description: string;
  fullDoc: string;
}

const NODE_TYPES: NodeInfo[] = [
  { type: 'conditional', name: 'Conditional', category: 'logic', description: 'Branch workflow based on a condition', fullDoc: '' },
  { type: 'end', name: 'End', category: 'logic', description: 'Mark the end of a workflow branch', fullDoc: '' },
  { type: 'delay', name: 'Delay', category: 'logic', description: 'Pause workflow execution for a specified duration', fullDoc: '' },
  { type: 'map', name: 'Map', category: 'transform', description: 'Extract a property from each item in an array', fullDoc: '' },
  { type: 'filter', name: 'Filter', category: 'transform', description: 'Filter items in an array based on a condition', fullDoc: '' },
  { type: 'http_request', name: 'HTTP Request', category: 'integration', description: 'Make HTTP requests to external APIs', fullDoc: '' },
  { type: 'reddit_monitor', name: 'Reddit Monitor', category: 'integration', description: 'Search Reddit for posts matching keywords', fullDoc: '' },
  { type: 'twitter_monitor', name: 'Twitter Monitor', category: 'integration', description: 'Search Twitter/X for posts matching keywords', fullDoc: '' },
  { type: 'linkedin_monitor', name: 'LinkedIn Monitor', category: 'integration', description: 'Search LinkedIn for posts via ForumScout API', fullDoc: '' },
  { type: 'sora_video', name: 'Sora Video', category: 'integration', description: 'Generate AI video using OpenAI Sora 2', fullDoc: '' },
  { type: 'seo_keyword_research', name: 'SEO Keyword Research', category: 'integration', description: 'Research keywords with search volume, difficulty, CPC, and intent data', fullDoc: '' },
  { type: 'seo_audit', name: 'SEO Audit', category: 'integration', description: 'Run comprehensive SEO audit on a URL', fullDoc: '' },
  { type: 'search_contacts', name: 'Search Contacts', category: 'integration', description: 'Search for contacts using Apollo.io with email enrichment', fullDoc: '' },
  { type: 'social_keyword_generator', name: 'Social Keyword Generator', category: 'action', description: 'Generate platform-specific search keywords from a topic using Claude', fullDoc: '' },
  { type: 'draft_emails', name: 'Draft Emails', category: 'action', description: 'Generate personalized email drafts for contacts using Claude', fullDoc: '' },
  { type: 'social_ai_analyze', name: 'Social AI Analyze', category: 'action', description: 'Analyze social media posts for relevance, sentiment, complaints, and urgency', fullDoc: '' },
];

// Extract per-node full docs from NODES_DOC
function extractNodeDocs(): void {
  for (const node of NODE_TYPES) {
    const regex = new RegExp(`### ${node.type}\\b[\\s\\S]*?(?=### \\w|## \\w|$)`);
    const match = NODES_DOC.match(regex);
    if (match) {
      node.fullDoc = match[0].trim();
    }
  }
}

extractNodeDocs();

// --- Public API ---

let _allSections: DocSection[] | null = null;

export function getAllSections(): DocSection[] {
  if (!_allSections) {
    _allSections = [
      ...parseSections(README_DOC, 'README'),
      ...parseSections(CORE_DOC, 'CORE'),
      ...parseSections(NODES_DOC, 'NODES'),
      ...parseSections(EDITOR_DOC, 'EDITOR'),
      ...parseSections(CREATING_NODES_DOC, 'CREATING-NODES'),
    ];
  }
  return _allSections;
}

export function searchSections(query: string, maxResults = 10): DocSection[] {
  const queryKeywords = extractKeywords(query);
  const sections = getAllSections();

  const scored = sections.map(section => {
    let score = 0;
    for (const qk of queryKeywords) {
      if (section.title.toLowerCase().includes(qk)) score += 3;
      if (section.keywords.includes(qk)) score += 1;
      if (section.content.toLowerCase().includes(qk)) score += 0.5;
    }
    return { section, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.section);
}

export function getNodeInfo(type: string): NodeInfo | undefined {
  return NODE_TYPES.find(n => n.type === type);
}

export function listNodes(): NodeInfo[] {
  return NODE_TYPES;
}

export function getApiReference(area: string): string | undefined {
  const areaMap: Record<string, string[]> = {
    'core': ['CORE'],
    'types': ['CORE'],
    'registry': ['CORE'],
    'execution-context': ['CORE'],
    'editor': ['EDITOR'],
    'workflow-runner': ['EDITOR'],
    'schema-introspector': ['EDITOR'],
    'nodes': ['NODES'],
  };

  const sources = areaMap[area.toLowerCase()];
  if (!sources) {
    // Try to find sections matching the area name
    const results = searchSections(area, 5);
    if (results.length > 0) {
      return results.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
    }
    return undefined;
  }

  const docMap: Record<string, string> = {
    'README': README_DOC,
    'CORE': CORE_DOC,
    'NODES': NODES_DOC,
    'EDITOR': EDITOR_DOC,
    'CREATING-NODES': CREATING_NODES_DOC,
  };

  return sources.map(s => docMap[s]).filter(Boolean).join('\n\n---\n\n');
}

export function getGuide(guide: string): string | undefined {
  const g = guide.toLowerCase();
  if (g.includes('creat') || g.includes('custom')) return CREATING_NODES_DOC;
  if (g.includes('quick') || g.includes('start') || g.includes('overview')) return README_DOC;
  if (g.includes('editor') || g.includes('visual')) return EDITOR_DOC;
  return undefined;
}
