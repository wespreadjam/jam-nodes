import React, { useRef, useState } from 'react';
import { s } from './styles';
import type { WorkflowJSON } from './types';

interface Props {
  workflowName: string;
  onNameChange: (name: string) => void;
  onExport: () => void;
  onImport: (wf: WorkflowJSON) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onRun?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
}

export function WorkflowToolbar(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleImport = () => fileRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        props.onImport(JSON.parse(reader.result as string));
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const btn = (id: string, label: string, onClick: () => void, disabled = false) => (
    <button
      style={{
        ...s.toolbarBtn,
        opacity: disabled ? 0.3 : 1,
        ...(hovered === id && !disabled ? { background: '#1a1a2e', color: '#e0e0e8' } : {}),
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
    >{label}</button>
  );

  return (
    <div style={s.toolbar}>
      <input
        value={props.workflowName}
        onChange={e => props.onNameChange(e.target.value)}
        style={s.toolbarNameInput}
        placeholder="Workflow name"
      />
      <div style={s.toolbarSep} />
      {props.isRunning && props.onStop ? (
        <button
          style={{
            ...s.toolbarBtn,
            background: '#f8717120',
            color: '#f87171',
            border: '1px solid #f8717140',
            ...(hovered === 'stop' ? { background: '#f8717130' } : {}),
          }}
          onClick={props.onStop}
          onMouseEnter={() => setHovered('stop')}
          onMouseLeave={() => setHovered(null)}
        >⏹ Stop</button>
      ) : props.onRun ? (
        <button
          style={{
            ...s.toolbarBtn,
            background: '#4ade8020',
            color: '#4ade80',
            border: '1px solid #4ade8040',
            ...(hovered === 'run' ? { background: '#4ade8030' } : {}),
          }}
          onClick={props.onRun}
          onMouseEnter={() => setHovered('run')}
          onMouseLeave={() => setHovered(null)}
        >▶ Run</button>
      ) : null}
      {btn('export', '↓ Export', props.onExport)}
      {btn('import', '↑ Import', handleImport)}
      <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ display: 'none' }} />
      <div style={s.toolbarSep} />
      {btn('undo', '⟲', props.onUndo, !props.canUndo)}
      {btn('redo', '⟳', props.onRedo, !props.canRedo)}
      <div style={{ flex: 1 }} />
      {btn('zout', '−', props.onZoomOut)}
      {btn('fit', '⊞', props.onFitView)}
      {btn('zin', '+', props.onZoomIn)}
      <div style={s.toolbarSep} />
      {btn('clear', '✕ Clear', props.onClear)}
    </div>
  );
}
