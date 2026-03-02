import type {
  Workflow,
  WorkflowExecutionConfig,
  WorkflowExecutionResult,
  NodeStatus,
  ExecutionConfig,
} from '../types/execution.js';
import type { NodeExecutionResult } from '../types/node.js';
import { ExecutionContext, prepareNodeInput } from './context.js';
import { executeNode } from './execute-node.js';
import { topologicalSort } from './topological-sort.js';

/**
 * Execute a workflow DAG with configurable retry, caching, and timeout.
 *
 * Nodes are executed in topologically-sorted waves. Independent nodes
 * within the same wave run in parallel via Promise.allSettled().
 * Each node's output is stored in the execution context so downstream
 * nodes can reference it via {{nodeId.field}} interpolation.
 *
 * @param workflow - The workflow DAG to execute
 * @param context - Execution context for variable interpolation and output storage
 * @param config - Optional execution configuration with per-node overrides
 */
export async function executeWorkflow(
  workflow: Workflow,
  context: ExecutionContext,
  config?: WorkflowExecutionConfig,
): Promise<WorkflowExecutionResult> {
  const waves = topologicalSort(workflow);
  const workflowExecutionId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
  const statuses: Record<string, NodeStatus> = {};
  const results: Record<string, NodeExecutionResult> = {};
  const skippedNodes = new Set<string>();

  // Build a map of downstream nodes for skip propagation
  const downstreamOf = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const list = downstreamOf.get(edge.from) ?? [];
    list.push(edge.to);
    downstreamOf.set(edge.from, list);
  }

  // Build edge lookup for conditional branching
  const edgesFrom = new Map<string, typeof workflow.edges>();
  for (const edge of workflow.edges) {
    const list = edgesFrom.get(edge.from) ?? [];
    list.push(edge);
    edgesFrom.set(edge.from, list);
  }

  for (const id of nodeMap.keys()) {
    statuses[id] = 'idle';
  }

  for (const wave of waves) {
    const wavePromises = wave.map(async (nodeId) => {
      if (skippedNodes.has(nodeId)) {
        statuses[nodeId] = 'skipped';
        return;
      }

      if (config?.signal?.aborted) {
        statuses[nodeId] = 'skipped';
        return;
      }

      const workflowNode = nodeMap.get(nodeId);
      if (!workflowNode) {
        statuses[nodeId] = 'error';
        results[nodeId] = { success: false, error: `Node "${nodeId}" not found in workflow` };
        return;
      }

      statuses[nodeId] = 'running';
      config?.onNodeStart?.(nodeId, workflowNode.type);

      // Resolve per-node config: merge base config with node-specific overrides
      const nodeConfig = resolveNodeConfig(config, workflowNode.type);

      // Interpolate variables into the node input
      const interpolatedInput = prepareNodeInput(workflowNode.input, context);

      const nodeContext = context.toNodeContext(config?.userId ?? '', workflowExecutionId);

      try {
        const result = await executeNode(
          workflowNode.node,
          interpolatedInput,
          nodeContext,
          nodeConfig,
        );

        results[nodeId] = result as NodeExecutionResult;

        if (result.success) {
          statuses[nodeId] = 'success';
          config?.onNodeComplete?.(nodeId, result as NodeExecutionResult);

          if (result.output !== undefined) {
            context.storeNodeOutput(nodeId, result.output);
          }

          // Handle conditional branching: skip branches not taken
          if (result.nextNodeId) {
            const edges = edgesFrom.get(nodeId) ?? [];
            for (const edge of edges) {
              if (edge.condition && edge.condition !== result.nextNodeId) {
                skippedNodes.add(edge.to);
                markDownstreamSkipped(edge.to, skippedNodes, downstreamOf);
              }
            }
          }
        } else {
          statuses[nodeId] = 'error';
          const error = new Error(result.error ?? 'Node execution failed');
          config?.onNodeError?.(nodeId, error);

          if (config?.stopOnError !== false) {
            markDownstreamSkipped(nodeId, skippedNodes, downstreamOf);
          }
        }
      } catch (err) {
        statuses[nodeId] = 'error';
        const error = err instanceof Error ? err : new Error(String(err));
        results[nodeId] = { success: false, error: error.message };
        config?.onNodeError?.(nodeId, error);

        if (config?.stopOnError !== false) {
          markDownstreamSkipped(nodeId, skippedNodes, downstreamOf);
        }
      }
    });

    await Promise.allSettled(wavePromises);
  }

  const allStatuses = Object.values(statuses);
  const success = allStatuses.every((s) => s === 'success' || s === 'skipped');

  return { success, results, statuses };
}

function resolveNodeConfig(
  config: WorkflowExecutionConfig | undefined,
  nodeType: string,
): ExecutionConfig | undefined {
  if (!config) return undefined;

  const override = config.nodeConfig?.[nodeType];
  if (!override) {
    return extractBaseConfig(config);
  }

  const base = extractBaseConfig(config);
  return {
    ...base,
    ...override,
    retry: override.retry ?? base?.retry,
    cache: override.cache ?? base?.cache,
  };
}

function extractBaseConfig(config: WorkflowExecutionConfig): ExecutionConfig {
  return {
    retry: config.retry,
    cache: config.cache,
    timeout: config.timeout,
    signal: config.signal,
    onRetry: config.onRetry,
  };
}

function markDownstreamSkipped(
  nodeId: string,
  skippedNodes: Set<string>,
  downstreamOf: Map<string, string[]>,
): void {
  const queue = downstreamOf.get(nodeId) ?? [];
  for (const downstream of queue) {
    if (!skippedNodes.has(downstream)) {
      skippedNodes.add(downstream);
      markDownstreamSkipped(downstream, skippedNodes, downstreamOf);
    }
  }
}
