import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRegistry } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { WorkflowEditor } from '../WorkflowEditor';
import type { WorkflowJSON } from '../types';

const registry = createRegistry();
registry.registerAll(builtInNodes as any);

const DEFAULT_WORKFLOW: WorkflowJSON = {
  name: 'Reddit News Summary',
  description: 'Monitor Reddit, filter relevant posts, and analyze with AI',
  nodes: [
    {
      id: 'reddit_1',
      type: 'reddit_monitor',
      position: { x: 80, y: 200 },
      config: {
        keywords: ['AI', 'automation', 'workflow'],
        subreddits: ['technology', 'programming'],
        limit: 25,
      },
    },
    {
      id: 'filter_1',
      type: 'filter',
      position: { x: 450, y: 200 },
      config: {
        property: 'score',
        operator: 'gt',
        value: 10,
      },
    },
    {
      id: 'analyze_1',
      type: 'social_ai_analyze',
      position: { x: 820, y: 200 },
      config: {
        topic: 'AI and automation trends',
        userIntent: 'Track emerging tools and frameworks',
      },
    },
  ],
  edges: [
    {
      id: 'edge_1',
      source: 'reddit_1',
      sourceHandle: 'posts',
      target: 'filter_1',
      targetHandle: 'items',
    },
    {
      id: 'edge_2',
      source: 'filter_1',
      sourceHandle: 'filtered',
      target: 'analyze_1',
      targetHandle: 'posts',
    },
  ],
};

function App() {
  return (
    <WorkflowEditor
      registry={registry}
      initialWorkflow={DEFAULT_WORKFLOW}
      storageKey="default"
      onChange={(wf) => console.log('Workflow changed:', wf)}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
