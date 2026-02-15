import React from 'react';
import type { SchemaFieldInfo } from './types';
import { s } from './styles';

interface Props {
  nodeId: string;
  nodeName: string;
  fields: SchemaFieldInfo[];
  config: Record<string, unknown>;
  connectedInputs: Set<string>;
  onChange: (field: string, value: unknown) => void;
}

function FieldInput({ field, value, onChange }: { field: SchemaFieldInfo; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#5b8def' }}
      />
    );
  }
  if (field.type === 'enum' && field.enumValues) {
    return (
      <select
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value)}
        style={s.configInput as React.CSSProperties}
      >
        <option value="">--</option>
        {field.enumValues.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value == null ? '' : String(value)}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        style={s.configInput as React.CSSProperties}
      />
    );
  }
  return (
    <input
      type="text"
      value={value == null ? '' : String(value)}
      onChange={e => onChange(e.target.value)}
      style={s.configInput as React.CSSProperties}
    />
  );
}

export function NodeConfigPanel({ nodeId, nodeName, fields, config, connectedInputs, onChange }: Props) {
  return (
    <div style={s.configPanel as React.CSSProperties}>
      <div style={s.configTitle}>{nodeName}</div>
      <div style={{ fontSize: 11, color: '#5a5a72', marginBottom: 16 }}>ID: {nodeId}</div>
      {fields.map(field => {
        const connected = connectedInputs.has(field.name);
        return (
          <div key={field.name} style={s.configField}>
            <label style={s.configLabel as React.CSSProperties}>
              {field.name}
              {field.required && <span style={{ color: '#ef4444' }}> *</span>}
              {connected && <span style={s.configConnected}>connected</span>}
            </label>
            {field.description && <div style={{ fontSize: 10, color: '#5a5a72', marginBottom: 4 }}>{field.description}</div>}
            {connected ? (
              <div style={{ fontSize: 11, color: '#5a5a72', fontStyle: 'italic', padding: '6px 0' }}>Value from edge</div>
            ) : (
              <FieldInput field={field} value={config[field.name]} onChange={v => onChange(field.name, v)} />
            )}
          </div>
        );
      })}
      {fields.length === 0 && <div style={{ color: '#5a5a72', fontSize: 12 }}>No configurable fields</div>}
    </div>
  );
}
