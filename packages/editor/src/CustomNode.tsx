import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeCategory } from '@jam-nodes/core';
import type { SchemaFieldInfo } from './types';
import type { NodeStatus } from './WorkflowRunner';
import { CATEGORY_COLORS, s } from './styles';

export interface CustomNodeData {
  label: string;
  category: NodeCategory;
  nodeType: string;
  inputFields: SchemaFieldInfo[];
  outputFields: SchemaFieldInfo[];
  executionStatus?: NodeStatus['status'];
  [key: string]: unknown;
}

const statusOverlay: Record<string, React.CSSProperties> = {
  running: {},
  success: { boxShadow: '0 0 12px #4ade8040' },
  error: { boxShadow: '0 0 12px #f8717140' },
  skipped: { opacity: 0.45 },
};

function StatusIcon({ status }: { status?: NodeStatus['status'] }) {
  if (!status || status === 'idle') return null;
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    zIndex: 10,
  };
  if (status === 'running') {
    return <span className="jam-node-spinner" style={{ ...style, color: '#5b8def' }}>◌</span>;
  }
  if (status === 'success') return <span style={{ ...style, color: '#4ade80' }}>✓</span>;
  if (status === 'error') return <span style={{ ...style, color: '#f87171' }}>✗</span>;
  return null;
}

function CustomNodeComponent({ data, selected }: NodeProps & { data: CustomNodeData }) {
  const color = CATEGORY_COLORS[data.category] ?? '#6b7280';
  const inputs = data.inputFields ?? [];
  const outputs = data.outputFields ?? [];
  const totalHandles = Math.max(inputs.length, outputs.length, 1);
  const execStatus = data.executionStatus;

  const baseStyle = s.node(color, !!selected);
  const overlay = execStatus ? statusOverlay[execStatus] ?? {} : {};
  const runningClass = execStatus === 'running' ? 'jam-node-running' : '';

  return (
    <div
      className={runningClass}
      style={{
        ...baseStyle,
        ...overlay,
        position: 'relative',
        ...(execStatus === 'running' ? { borderColor: color, borderWidth: 2, borderStyle: 'solid' } : {}),
      }}
    >
      <StatusIcon status={execStatus} />
      <div style={s.nodeHeader(color)}>
        <span style={s.nodeBadge(color) as React.CSSProperties}>{data.category}</span>
        <span style={s.nodeName}>{data.label}</span>
      </div>
      <div style={s.nodePorts}>
        <div style={s.nodePortCol as React.CSSProperties}>
          {inputs.map((f, i) => (
            <div key={f.name} style={s.nodePortLabel('left') as React.CSSProperties}>
              <Handle
                type="target"
                position={Position.Left}
                id={f.name}
                style={{
                  top: `${((i + 1) / (inputs.length + 1)) * 100}%`,
                  ...s.nodeHandle(color),
                }}
              />
              {f.name}
            </div>
          ))}
        </div>
        <div style={s.nodePortCol as React.CSSProperties}>
          {outputs.map((f, i) => (
            <div key={f.name} style={s.nodePortLabel('right') as React.CSSProperties}>
              {f.name}
              <Handle
                type="source"
                position={Position.Right}
                id={f.name}
                style={{
                  top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
                  ...s.nodeHandle(color),
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {totalHandles === 0 && (
        <>
          <Handle type="target" position={Position.Left} style={s.nodeHandle(color)} />
          <Handle type="source" position={Position.Right} style={s.nodeHandle(color)} />
        </>
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
