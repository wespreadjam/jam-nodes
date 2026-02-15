import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeCategory } from '@jam-nodes/core';
import type { SchemaFieldInfo } from './types';
import { CATEGORY_COLORS, s } from './styles';

export interface CustomNodeData {
  label: string;
  category: NodeCategory;
  nodeType: string;
  inputFields: SchemaFieldInfo[];
  outputFields: SchemaFieldInfo[];
  [key: string]: unknown;
}

function CustomNodeComponent({ data, selected }: NodeProps & { data: CustomNodeData }) {
  const color = CATEGORY_COLORS[data.category] ?? '#6b7280';
  const inputs = data.inputFields ?? [];
  const outputs = data.outputFields ?? [];
  const totalHandles = Math.max(inputs.length, outputs.length, 1);

  return (
    <div style={s.node(color, !!selected)}>
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
