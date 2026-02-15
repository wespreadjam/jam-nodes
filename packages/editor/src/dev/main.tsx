import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRegistry } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { WorkflowEditor } from '../WorkflowEditor';

const registry = createRegistry();
registry.registerAll(builtInNodes as any);

function App() {
  return (
    <WorkflowEditor
      registry={registry}
      onChange={(wf) => console.log('Workflow changed:', wf)}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
