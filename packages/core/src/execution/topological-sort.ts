import type { Workflow } from '../types/execution.js';

/**
 * Kahn's algorithm returning nodes grouped into execution waves.
 * Each wave contains node IDs whose dependencies are fully satisfied,
 * meaning all nodes within a wave can run in parallel.
 *
 * @throws Error if the workflow graph contains a cycle.
 */
export function topologicalSort(workflow: Workflow): string[][] {
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of workflow.edges) {
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const waves: string[][] = [];
  let queue: string[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  let processed = 0;

  while (queue.length > 0) {
    waves.push(queue);
    const nextQueue: string[] = [];

    for (const id of queue) {
      processed++;
      for (const neighbor of adjacency.get(id)!) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          nextQueue.push(neighbor);
        }
      }
    }

    queue = nextQueue;
  }

  if (processed !== nodeIds.size) {
    throw new Error('Workflow graph contains a cycle');
  }

  return waves;
}
