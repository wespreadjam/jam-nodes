import type { z } from 'zod';
import type { NodeServices } from './services.js';

/**
 * Credentials for API authentication.
 * Nodes use these to make direct HTTP calls without requiring injected services.
 */
export interface NodeCredentials {
  /** Apollo.io API credentials */
  apollo?: {
    apiKey: string;
  };
  /** Twitter/X API credentials */
  twitter?: {
    /** Official Twitter API v2 Bearer Token */
    bearerToken?: string;
    /** TwitterAPI.io API key (third-party, simpler) */
    twitterApiIoKey?: string;
  };
  /** ForumScout API credentials (for LinkedIn monitoring) */
  forumScout?: {
    apiKey: string;
  };
  /** DataForSEO API credentials */
  dataForSeo?: {
    /** Base64 encoded login:password */
    apiToken: string;
  };
  /** OpenAI API credentials */
  openai?: {
    apiKey: string;
  };
  /** Anthropic API credentials */
  anthropic?: {
    apiKey: string;
  };
  /** Discord Bot credentials */
  discordBot?: {
    botToken: string;
  };
  /** Discord Webhook credentials */
  discordWebhook?: {
    webhookUrl: string;
  };
}

/**
 * Base execution context passed to all node executors.
 * Provides access to workflow state and utilities.
 */
export interface NodeExecutionContext {
  /** User ID executing the workflow */
  userId: string;
  /** Optional campaign/project context */
  campaignId?: string;
  /** Unique identifier for this workflow execution */
  workflowExecutionId: string;
  /** Variables from previous node outputs */
  variables: Record<string, unknown>;
  /** Resolve nested path like "contact.email" or "data[0].name" */
  resolveNestedPath: (path: string) => unknown;
  /** API credentials for direct HTTP calls */
  credentials?: NodeCredentials;
  /**
   * Optional services injected by host application.
   * @deprecated Use credentials instead for standalone operation.
   */
  services?: NodeServices;
}

/**
 * Approval request metadata returned by nodes that need user approval.
 */
export interface NodeApprovalRequest {
  /** IDs of resources needing approval */
  resourceIds: string[];
  /** Type of resource for UI display */
  resourceType: string;
  /** Optional message to display to approver */
  message?: string;
  /** Component to use for displaying approval details */
  detailComponent?: string;
}

/**
 * Result returned by node executors.
 * @template TOutput - Type of the output data
 */
export interface NodeExecutionResult<TOutput = unknown> {
  /** Whether execution succeeded */
  success: boolean;
  /** Output data on success */
  output?: TOutput;
  /** Error message on failure */
  error?: string;
  /** Next node ID for conditional branching */
  nextNodeId?: string;
  /** Approval request if node needs user approval */
  needsApproval?: NodeApprovalRequest;
  /** Notification to send to user */
  notification?: {
    title: string;
    message: string;
    data?: Record<string, unknown>;
  };
}

/**
 * Node executor function type.
 * Async function that takes input and context, returns result.
 * @template TInput - Input type (validated by inputSchema)
 * @template TOutput - Output type (validated by outputSchema)
 */
export type NodeExecutor<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: NodeExecutionContext
) => Promise<NodeExecutionResult<TOutput>>;

/**
 * Node capabilities for UI and runtime behavior.
 */
export interface NodeCapabilities {
  /** Node supports data enrichment */
  supportsEnrichment?: boolean;
  /** Node supports bulk actions */
  supportsBulkActions?: boolean;
  /** Node supports approval workflow */
  supportsApproval?: boolean;
  /** Node can be re-run after completion */
  supportsRerun?: boolean;
  /** Node supports cancellation */
  supportsCancel?: boolean;
}

/**
 * Node category for organization.
 */
export type NodeCategory = 'action' | 'logic' | 'integration' | 'transform';

/**
 * Metadata about a node (safe for client-side use).
 */
export interface NodeMetadata {
  /** Unique node type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Description of what the node does */
  description: string;
  /** Category for grouping */
  category: NodeCategory;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Node capabilities */
  capabilities?: NodeCapabilities;
}

/**
 * Complete node definition including executor.
 * @template TInput - Input type
 * @template TOutput - Output type
 */
export interface NodeDefinition<TInput = unknown, TOutput = unknown>
  extends NodeMetadata {
  /** Zod schema for validating input */
  inputSchema: z.ZodSchema<TInput>;
  /** Zod schema for validating output */
  outputSchema: z.ZodSchema<TOutput>;
  /** Executor function */
  executor: NodeExecutor<TInput, TOutput>;
}
