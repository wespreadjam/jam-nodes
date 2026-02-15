export interface WorkflowJSON {
  name: string;
  description?: string;
  nodes: WorkflowNodeJSON[];
  edges: WorkflowEdgeJSON[];
}

export interface WorkflowNodeJSON {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface WorkflowEdgeJSON {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface SchemaFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'unknown';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];
  children?: SchemaFieldInfo[];
}
