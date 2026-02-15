import React, { useState } from 'react';
import type { NodeStatus } from './WorkflowRunner';
import { s as baseStyles } from './styles';

interface Props {
  nodeStatuses: Map<string, NodeStatus>;
  totalDurationMs: number;
  onClose: () => void;
}

const panelStyle: React.CSSProperties = {
  width: 340,
  background: '#0e0e16',
  borderLeft: '1px solid #1e1e30',
  overflowY: 'auto',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #1e1e30',
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '12px 16px',
  borderBottom: '1px solid #1e1e30',
  fontSize: 12,
};

const statStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
};

const nodeItemStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderBottom: '1px solid #1a1a2a',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const statusIcons: Record<string, string> = {
  success: '✓',
  error: '✗',
  skipped: '⊘',
  idle: '○',
  running: '◌',
};

const statusColors: Record<string, string> = {
  success: '#4ade80',
  error: '#f87171',
  skipped: '#6b7280',
  idle: '#6b7280',
  running: '#5b8def',
};

export function ExecutionResultPanel({ nodeStatuses, totalDurationMs, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const statuses = Array.from(nodeStatuses.values());
  const successCount = statuses.filter(s => s.status === 'success').length;
  const errorCount = statuses.filter(s => s.status === 'error').length;
  const skippedCount = statuses.filter(s => s.status === 'skipped').length;

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e8' }}>Execution Results</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8888a0',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 6px',
          }}
        >✕</button>
      </div>

      <div style={summaryStyle}>
        <div style={statStyle}>
          <span style={{ color: '#8888a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Time</span>
          <span style={{ color: '#e0e0e8', fontWeight: 600 }}>{totalDurationMs}ms</span>
        </div>
        <div style={statStyle}>
          <span style={{ color: '#8888a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Success</span>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>{successCount}</span>
        </div>
        <div style={statStyle}>
          <span style={{ color: '#8888a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Errors</span>
          <span style={{ color: errorCount > 0 ? '#f87171' : '#8888a0', fontWeight: 600 }}>{errorCount}</span>
        </div>
        <div style={statStyle}>
          <span style={{ color: '#8888a0', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Skipped</span>
          <span style={{ color: '#8888a0', fontWeight: 600 }}>{skippedCount}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {statuses.map(ns => {
          const isExpanded = expanded.has(ns.nodeId);
          const color = statusColors[ns.status] ?? '#6b7280';
          return (
            <div key={ns.nodeId}>
              <div
                style={{
                  ...nodeItemStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => toggle(ns.nodeId)}
              >
                <span style={{ color, fontWeight: 700, fontSize: 14, width: 16, textAlign: 'center' }}>
                  {statusIcons[ns.status]}
                </span>
                <span style={{ color: '#e0e0e8', fontSize: 12, fontWeight: 500, flex: 1 }}>
                  {ns.nodeId}
                </span>
                {ns.durationMs !== undefined && (
                  <span style={{ color: '#5a5a72', fontSize: 10 }}>{ns.durationMs}ms</span>
                )}
                <span style={{ color: '#5a5a72', fontSize: 10 }}>{isExpanded ? '▼' : '▶'}</span>
              </div>
              {isExpanded && (
                <div style={{ padding: '4px 16px 12px 40px', fontSize: 11 }}>
                  {ns.error && (
                    <div style={{ color: '#f87171', marginBottom: 4, whiteSpace: 'pre-wrap' }}>{ns.error}</div>
                  )}
                  {ns.output !== undefined && (
                    <pre style={{
                      color: '#a0a0b8',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 200,
                      overflow: 'auto',
                      background: '#13131a',
                      padding: 8,
                      borderRadius: 4,
                      fontSize: 10,
                    }}>
                      {typeof ns.output === 'string' ? ns.output : JSON.stringify(ns.output, null, 2)}
                    </pre>
                  )}
                  {!ns.error && ns.output === undefined && (
                    <span style={{ color: '#5a5a72' }}>No output</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
