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
      {props.onRun && btn('run', '▶ Run', props.onRun)}
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
