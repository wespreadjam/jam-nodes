import type { NodeDefinition, NodeExecutionResult } from './node.js';

/**
 * Configuration for retry behavior on node execution failure.
 */
export interface RetryConfig {
  /** Maximum number of execution attempts */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  backoffMs: number;
  /** Multiplier applied to backoffMs after each retry (default: 2) */
  backoffMultiplier?: number;
  /** Upper bound on backoff delay in milliseconds */
  maxBackoffMs?: number;
  /** Predicate to decide whether a given error should trigger a retry */
  retryOn?: (error: Error) => boolean;
}

/**
 * Interface for pluggable cache backends.
 * Implement this to use Redis, Memcached, or any other store.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Configuration for caching node execution results.
 */
export interface CacheConfig {
  /** Whether caching is active */
  enabled: boolean;
  /** Time-to-live for cached entries in milliseconds */
  ttlMs: number;
  /** Custom function to derive a cache key from the node input */
  keyFn?: (input: unknown) => string;
  /** Cache backend to use */
  store: CacheStore;
}

/**
 * Interface for pluggable rate-limit state backends.
 * Tracks request timestamps per key to enforce windowed limits.
 */
export interface RateLimitStore {
  /** Record a request timestamp for the given key */
  record(key: string): Promise<void>;
  /** Get the number of requests within the current window for the given key */
  getCount(key: string, windowMs: number): Promise<number>;
  /** Get the oldest timestamp in the current window (for calculating wait time) */
  getOldestInWindow(key: string, windowMs: number): Promise<number | undefined>;
}

/**
 * Configuration for rate-limiting node execution.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed within the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limit state backend */
  store: RateLimitStore;
  /** Custom function to derive a rate-limit key from the node input (default: returns 'default') */
  keyFn?: (input: unknown) => string;
}

/**
 * Configuration for a single node execution.
 * Controls retry, caching, rate-limiting, timeout, and cancellation.
 */
export interface ExecutionConfig {
  retry?: RetryConfig;
  cache?: CacheConfig;
  rateLimit?: RateLimitConfig;
  /** Maximum execution time per attempt in milliseconds */
  timeout?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Called after each failed attempt before the next retry */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Configuration for workflow execution.
 * Extends ExecutionConfig with per-node overrides and lifecycle callbacks.
 */
export interface WorkflowExecutionConfig extends ExecutionConfig {
  /** User ID passed to each node's execution context */
  userId?: string;
  /** Per-node-type config overrides (keyed by node type, e.g. 'http_request') */
  nodeConfig?: Record<string, Partial<ExecutionConfig>>;
  /** If true (default), downstream nodes are skipped when a node fails */
  stopOnError?: boolean;
  onNodeStart?: (nodeId: string, nodeType: string) => void;
  onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
}

/** Lifecycle state of a node during workflow execution. */
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

/** A node instance within a workflow DAG. */
export interface WorkflowNode {
  /** Unique identifier for this node within the workflow */
  id: string;
  /** Node type (e.g. 'http_request'), used to match nodeConfig keys */
  type: string;
  /** The node definition containing the executor */
  node: NodeDefinition;
  /** Raw input to pass to the node (supports {{variable}} interpolation) */
  input: Record<string, unknown>;
}

/** A directed edge between two nodes in the workflow DAG. */
export interface WorkflowEdge {
  from: string;
  to: string;
  /** When set, this edge is only followed if the source node's nextNodeId matches */
  condition?: string;
}

/** A directed acyclic graph of workflow nodes. */
export interface Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** ID of the root node (used for documentation; execution order is derived from edges) */
  entryNodeId: string;
}

/** Aggregate result returned by executeWorkflow. */
export interface WorkflowExecutionResult {
  /** True if every non-skipped node succeeded */
  success: boolean;
  /** Individual result for each node, keyed by node ID */
  results: Record<string, NodeExecutionResult>;
  /** Final status of each node, keyed by node ID */
  statuses: Record<string, NodeStatus>;
  /** Workflow-level error message, if any */
  error?: string;
}
