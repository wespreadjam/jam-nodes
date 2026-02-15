import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react';
import type { NodeRegistry } from '@jam-nodes/core';
import type { WorkflowJSON } from './types';
import type { CustomNodeData } from './CustomNode';
import { introspectSchema } from './ZodSchemaIntrospector';
import { NodePalette } from './NodePalette';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import { ExecutionResultPanel } from './ExecutionResultPanel';
import { WorkflowRunner, type NodeStatus } from './WorkflowRunner';
import { s, CSS_OVERRIDES } from './styles';

interface Props {
  registry: NodeRegistry;
  initialWorkflow?: WorkflowJSON;
  onChange?: (workflow: WorkflowJSON) => void;
  storageKey?: string;
}

const STORAGE_PREFIX = 'jam-editor:';

function loadFromStorage(key: string): WorkflowJSON | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as WorkflowJSON;
  } catch { return null; }
}

function saveToStorage(key: string, wf: WorkflowJSON): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(wf));
  } catch { /* quota exceeded, ignore */ }
}

let idCounter = 0;
function newId() { return `node_${++idCounter}_${Date.now()}`; }

function toFlowNodes(wf: WorkflowJSON, registry: NodeRegistry): Node[] {
  return wf.nodes.map(n => {
    const def = registry.getDefinition(n.type);
    return {
      id: n.id,
      type: 'custom',
      position: n.position,
      data: {
        label: def?.name ?? n.type,
        category: def?.category ?? 'action',
        nodeType: n.type,
        inputFields: def ? introspectSchema(def.inputSchema) : [],
        outputFields: def ? introspectSchema(def.outputSchema) : [],
        config: n.config,
      } satisfies CustomNodeData,
    };
  });
}

function toFlowEdges(wf: WorkflowJSON): Edge[] {
  return wf.edges.map(e => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle,
    target: e.target,
    targetHandle: e.targetHandle,
  }));
}

function toWorkflowJSON(name: string, desc: string, nodes: Node[], edges: Edge[]): WorkflowJSON {
  return {
    name,
    description: desc || undefined,
    nodes: nodes.map(n => ({
      id: n.id,
      type: (n.data as CustomNodeData).nodeType,
      position: n.position,
      config: (((n.data as CustomNodeData)['config'] as Record<string, unknown>) ?? {}),
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? '',
      target: e.target,
      targetHandle: e.targetHandle ?? '',
    })),
  };
}

function EditorInner({ registry, initialWorkflow, onChange, storageKey }: Props) {
  const stored = storageKey ? loadFromStorage(storageKey) : null;
  const initial = stored ?? initialWorkflow ?? { name: 'Untitled Workflow', nodes: [], edges: [] };
  const [wfName, setWfName] = useState(initial.name);
  const [wfDesc] = useState(initial.description ?? '');
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initial, registry));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(initial));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  const [runResult, setRunResult] = useState<{ totalDurationMs: number; nodeStatuses: Map<string, NodeStatus> } | null>(null);
  const runnerRef = useRef<WorkflowRunner | null>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Undo/redo
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const futureRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [histLen, setHistLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);

  const pushHistory = useCallback(() => {
    historyRef.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    futureRef.current = [];
    setHistLen(historyRef.current.length);
    setFutureLen(0);
  }, [nodes, edges]);

  // Notify onChange + auto-save to localStorage
  useEffect(() => {
    const wf = toWorkflowJSON(wfName, wfDesc, nodes, edges);
    onChange?.(wf);
    if (storageKey) saveToStorage(storageKey, wf);
  }, [nodes, edges, wfName]);

  const onConnect: OnConnect = useCallback((params) => {
    pushHistory();
    setEdges(eds => addEdge(params, eds));
  }, [setEdges, pushHistory]);

  const onDropNode = useCallback((type: string, position: { x: number; y: number }) => {
    pushHistory();
    const def = registry.getDefinition(type);
    if (!def) return;
    const id = newId();
    const newNode: Node = {
      id,
      type: 'custom',
      position,
      data: {
        label: def.name,
        category: def.category,
        nodeType: type,
        inputFields: introspectSchema(def.inputSchema),
        outputFields: introspectSchema(def.outputSchema),
        config: {},
      } satisfies CustomNodeData,
    };
    setNodes(nds => [...nds, newNode]);
  }, [registry, setNodes, pushHistory]);

  const onUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
  }, [nodes, edges, setNodes, setEdges]);

  const onRedo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
  }, [nodes, edges, setNodes, setEdges]);

  const onExport = useCallback(() => {
    const wf = toWorkflowJSON(wfName, wfDesc, nodes, edges);
    const blob = new Blob([JSON.stringify(wf, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wfName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [wfName, wfDesc, nodes, edges]);

  const onImport = useCallback((wf: WorkflowJSON) => {
    pushHistory();
    setWfName(wf.name);
    setNodes(toFlowNodes(wf, registry));
    setEdges(toFlowEdges(wf));
  }, [registry, setNodes, setEdges, pushHistory]);

  const onClear = useCallback(() => {
    pushHistory();
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, [setNodes, setEdges, pushHistory]);

  // Selected node info
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const selectedDef = selectedNode ? registry.getDefinition((selectedNode.data as CustomNodeData).nodeType) : undefined;
  const connectedInputs = useMemo(() => {
    const set = new Set<string>();
    if (selectedNodeId) {
      for (const e of edges) {
        if (e.target === selectedNodeId && e.targetHandle) set.add(e.targetHandle);
      }
    }
    return set;
  }, [edges, selectedNodeId]);

  const onConfigChange = useCallback((field: string, value: unknown) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== selectedNodeId) return n;
      const data = n.data as CustomNodeData;
      return { ...n, data: { ...data, config: { ...((data['config'] as Record<string, unknown>) ?? {}), [field]: value } } };
    }));
  }, [selectedNodeId, setNodes]);

  // Inject execution status into nodes
  useEffect(() => {
    if (nodeStatuses.size === 0) return;
    setNodes(nds => nds.map(n => {
      const status = nodeStatuses.get(n.id);
      const data = n.data as CustomNodeData;
      const newStatus = status?.status ?? 'idle';
      if (data.executionStatus === newStatus) return n;
      return { ...n, data: { ...data, executionStatus: newStatus } };
    }));
  }, [nodeStatuses, setNodes]);

  const onRun = useCallback(async () => {
    const wf = toWorkflowJSON(wfName, wfDesc, nodes, edges);
    setIsRunning(true);
    setRunResult(null);
    setNodeStatuses(new Map());

    const runner = new WorkflowRunner(registry, {
      onStatus: (nodeId, status) => {
        setNodeStatuses(prev => new Map(prev).set(nodeId, status));
      },
    });
    runnerRef.current = runner;

    try {
      const result = await runner.run(wf);
      setRunResult({ totalDurationMs: result.totalDurationMs, nodeStatuses: result.nodeStatuses });
      setNodeStatuses(result.nodeStatuses);
    } finally {
      setIsRunning(false);
      runnerRef.current = null;
    }
  }, [wfName, wfDesc, nodes, edges, registry]);

  const onStop = useCallback(() => {
    runnerRef.current?.abort();
  }, []);

  // Inject CSS overrides once
  useEffect(() => {
    const id = 'jam-editor-css-overrides';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = CSS_OVERRIDES;
      document.head.appendChild(style);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div style={s.editorRoot}>
      <WorkflowToolbar
        workflowName={wfName}
        onNameChange={setWfName}
        onExport={onExport}
        onImport={onImport}
        onClear={onClear}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={histLen > 0}
        canRedo={futureLen > 0}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView()}
        onRun={onRun}
        onStop={onStop}
        isRunning={isRunning}
      />
      <div style={s.body}>
        <NodePalette registry={registry} />
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={setSelectedNodeId}
          onDropNode={onDropNode}
          registry={registry}
        />
        {runResult && (
          <ExecutionResultPanel
            nodeStatuses={runResult.nodeStatuses}
            totalDurationMs={runResult.totalDurationMs}
            onClose={() => {
              setRunResult(null);
              setNodeStatuses(new Map());
              // Clear execution status from nodes
              setNodes(nds => nds.map(n => {
                const data = n.data as CustomNodeData;
                if (!data.executionStatus) return n;
                return { ...n, data: { ...data, executionStatus: undefined } };
              }));
            }}
          />
        )}
        {selectedNode && selectedDef && (
          <NodeConfigPanel
            nodeId={selectedNode.id}
            nodeName={selectedDef.name}
            fields={introspectSchema(selectedDef.inputSchema)}
            config={(((selectedNode.data as CustomNodeData)['config'] as Record<string, unknown>) ?? {})}
            connectedInputs={connectedInputs}
            onChange={onConfigChange}
          />
        )}
      </div>
    </div>
  );
}

export function WorkflowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
