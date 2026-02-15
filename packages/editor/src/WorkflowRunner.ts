import { ExecutionContext, createExecutionContext } from '@jam-nodes/core';
import type { NodeRegistry } from '@jam-nodes/core';
import type { WorkflowJSON, WorkflowEdgeJSON } from './types';

export interface NodeStatus {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface RunResult {
  success: boolean;
  nodeStatuses: Map<string, NodeStatus>;
  totalDurationMs: number;
}

export type StatusCallback = (nodeId: string, status: NodeStatus) => void;

export interface WorkflowRunnerOptions {
  stopOnError?: boolean;
  onStatus?: StatusCallback;
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns node IDs in execution order.
 */
function topologicalSort(nodeIds: string[], edges: WorkflowEdgeJSON[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If some nodes weren't reached (cycle or disconnected), append them
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id);
  }

  return sorted;
}

export class WorkflowRunner {
  private abortController: AbortController | null = null;

  constructor(
    private registry: NodeRegistry,
    private options: WorkflowRunnerOptions = {}
  ) {}

  get isRunning(): boolean {
    return this.abortController !== null;
  }

  abort(): void {
    this.abortController?.abort();
  }

  async run(workflow: WorkflowJSON): Promise<RunResult> {
    const startTime = performance.now();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const nodeStatuses = new Map<string, NodeStatus>();
    const context = createExecutionContext();
    const nodeOutputs = new Map<string, unknown>();

    // Initialize all nodes as idle
    for (const node of workflow.nodes) {
      nodeStatuses.set(node.id, { nodeId: node.id, status: 'idle' });
    }

    // Build lookup maps
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
    const nodeIds = workflow.nodes.map(n => n.id);
    const executionOrder = topologicalSort(nodeIds, workflow.edges);

    // Build edge lookup: target node -> list of edges into it
    const incomingEdges = new Map<string, WorkflowEdgeJSON[]>();
    for (const edge of workflow.edges) {
      const list = incomingEdges.get(edge.target) ?? [];
      list.push(edge);
      incomingEdges.set(edge.target, list);
    }

    // Track which nodes should be skipped due to conditional branching
    const skippedNodes = new Set<string>();
    let hasError = false;

    for (const nodeId of executionOrder) {
      if (signal.aborted) break;

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      if (skippedNodes.has(nodeId)) {
        const status: NodeStatus = { nodeId, status: 'skipped' };
        nodeStatuses.set(nodeId, status);
        this.options.onStatus?.(nodeId, status);
        continue;
      }

      // Set running
      const runningStatus: NodeStatus = { nodeId, status: 'running' };
      nodeStatuses.set(nodeId, runningStatus);
      this.options.onStatus?.(nodeId, runningStatus);

      // Resolve inputs: start with static config, then override with edge-connected values
      const resolvedInput: Record<string, unknown> = { ...(node.config ?? {}) };

      const incoming = incomingEdges.get(nodeId) ?? [];
      for (const edge of incoming) {
        const sourceOutput = nodeOutputs.get(edge.source);
        if (sourceOutput !== undefined) {
          // Extract the specific field from source output
          if (sourceOutput && typeof sourceOutput === 'object' && edge.sourceHandle in (sourceOutput as Record<string, unknown>)) {
            resolvedInput[edge.targetHandle] = (sourceOutput as Record<string, unknown>)[edge.sourceHandle];
          } else {
            // If sourceHandle doesn't match a key, pass the whole output
            resolvedInput[edge.targetHandle] = sourceOutput;
          }
        }
      }

      const executor = this.registry.getExecutor(node.type);
      if (!executor) {
        const errStatus: NodeStatus = {
          nodeId,
          status: 'error',
          error: `No executor found for node type "${node.type}"`,
          durationMs: 0,
        };
        nodeStatuses.set(nodeId, errStatus);
        this.options.onStatus?.(nodeId, errStatus);
        hasError = true;
        if (this.options.stopOnError) break;
        continue;
      }

      const nodeStart = performance.now();
      try {
        const nodeContext = context.toNodeContext('editor-user', `run-${Date.now()}`);
        // Provide empty services so nodes that don't need them still work
        nodeContext.services = {} as any;

        const result = await executor(resolvedInput, nodeContext);
        const durationMs = Math.round(performance.now() - nodeStart);

        if (result.success) {
          const output = result.output;
          nodeOutputs.set(nodeId, output);
          context.storeNodeOutput(nodeId, output);

          const successStatus: NodeStatus = {
            nodeId,
            status: 'success',
            output,
            durationMs,
          };
          nodeStatuses.set(nodeId, successStatus);
          this.options.onStatus?.(nodeId, successStatus);

          // Handle conditional branching
          if (result.nextNodeId) {
            // Find all direct children of this node
            const childEdges = workflow.edges.filter(e => e.source === nodeId);
            for (const ce of childEdges) {
              if (ce.target !== result.nextNodeId) {
                skippedNodes.add(ce.target);
              }
            }
          }
        } else {
          const errStatus: NodeStatus = {
            nodeId,
            status: 'error',
            error: result.error ?? 'Unknown error',
            durationMs,
          };
          nodeStatuses.set(nodeId, errStatus);
          this.options.onStatus?.(nodeId, errStatus);
          hasError = true;
          if (this.options.stopOnError) break;
        }
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - nodeStart);
        const errStatus: NodeStatus = {
          nodeId,
          status: 'error',
          error: err?.message ?? String(err),
          durationMs,
        };
        nodeStatuses.set(nodeId, errStatus);
        this.options.onStatus?.(nodeId, errStatus);
        hasError = true;
        if (this.options.stopOnError) break;
      }
    }

    this.abortController = null;
    const totalDurationMs = Math.round(performance.now() - startTime);

    return {
      success: !hasError,
      nodeStatuses,
      totalDurationMs,
    };
  }
}
