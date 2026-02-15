import type { CSSProperties } from 'react';
import type { NodeCategory } from '@jam-nodes/core';

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  action: '#5b8def',
  logic: '#b07ce8',
  integration: '#4ade80',
  transform: '#f59e42',
};

// Muted versions for backgrounds
const CATEGORY_BG: Record<NodeCategory, string> = {
  action: '#5b8def18',
  logic: '#b07ce818',
  integration: '#4ade8018',
  transform: '#f59e4218',
};

export const CSS_OVERRIDES = `
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a3a52; }

  /* React Flow overrides */
  .react-flow__background { background: #0a0a0f !important; }
  .react-flow__controls { background: #13131a !important; border: 1px solid #2a2a3e !important; border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important; }
  .react-flow__controls-button { background: #13131a !important; border-bottom: 1px solid #2a2a3e !important; fill: #8888a0 !important; color: #8888a0 !important; }
  .react-flow__controls-button:hover { background: #1a1a2e !important; fill: #e0e0e8 !important; }
  .react-flow__minimap { background: #13131a !important; border: 1px solid #2a2a3e !important; border-radius: 8px !important; }
  .react-flow__edge-path { stroke: #3a3a52 !important; stroke-width: 2 !important; }
  .react-flow__edge.selected .react-flow__edge-path { stroke: #5b8def !important; stroke-dasharray: 5 5 !important; animation: dashmove 0.5s linear infinite !important; }
  .react-flow__connection-line { stroke: #5b8def !important; }
  .react-flow__attribution { display: none !important; }
  @keyframes dashmove { to { stroke-dashoffset: -10; } }

  /* Node execution status animations */
  @keyframes jam-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  @keyframes jam-spin { to { transform: rotate(360deg); } }
  .jam-node-running { animation: jam-pulse 1.2s ease-in-out infinite; }
  .jam-node-spinner { animation: jam-spin 1s linear infinite; display: inline-block; }

  /* Palette item hover */
  .palette-item { transition: background 0.15s, border-left 0.15s; border-left: 2px solid transparent; }
  .palette-item:hover { background: #1a1a2e; }
`;

export const s = {
  editorRoot: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    color: '#e0e0e8',
    background: '#0a0a0f',
  } as CSSProperties,

  // Toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#0e0e16',
    borderBottom: '1px solid #1e1e30',
    flexShrink: 0,
  } as CSSProperties,
  toolbarBtn: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    color: '#8888a0',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.15s',
  } as CSSProperties,
  toolbarBtnHover: {
    background: '#1a1a2e',
    color: '#e0e0e8',
  } as CSSProperties,
  toolbarNameInput: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    color: '#e0e0e8',
    fontSize: 15,
    fontWeight: 600,
    outline: 'none',
    width: 200,
    transition: 'border-color 0.15s',
  } as CSSProperties,
  toolbarSep: {
    width: 1,
    height: 20,
    background: '#1e1e30',
    margin: '0 6px',
    flexShrink: 0,
  } as CSSProperties,

  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  } as CSSProperties,

  // Palette
  palette: {
    width: 250,
    background: '#0e0e16',
    borderRight: '1px solid #1e1e30',
    overflowY: 'auto',
    flexShrink: 0,
  } as CSSProperties,
  paletteSearch: {
    width: '100%',
    padding: '10px 14px',
    background: '#13131a',
    border: 'none',
    borderBottom: '1px solid #1e1e30',
    color: '#e0e0e8',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  } as CSSProperties,
  paletteCat: {
    padding: '10px 14px 4px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8888a0',
  } as CSSProperties,
  paletteItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '8px 14px',
    cursor: 'grab',
    userSelect: 'none',
    borderLeft: '2px solid transparent',
    transition: 'background 0.15s, border-left-color 0.15s',
  } as CSSProperties,
  paletteItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,
  paletteDot: (color: string) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    boxShadow: `0 0 6px ${color}40`,
  } as CSSProperties),
  paletteItemName: {
    color: '#e0e0e8',
    fontSize: 12,
    fontWeight: 500,
  } as CSSProperties,
  paletteItemDesc: {
    color: '#5a5a72',
    fontSize: 10,
    lineHeight: '1.3',
    paddingLeft: 16,
  } as CSSProperties,

  // Canvas
  canvas: {
    flex: 1,
    background: '#0a0a0f',
  } as CSSProperties,

  // Config panel
  configPanel: {
    width: 300,
    background: '#0e0e16',
    borderLeft: '1px solid #1e1e30',
    overflowY: 'auto',
    flexShrink: 0,
    padding: 16,
  } as CSSProperties,
  configTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 4,
    color: '#e0e0e8',
  } as CSSProperties,
  configField: {
    marginBottom: 14,
  } as CSSProperties,
  configLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: '#8888a0',
    marginBottom: 4,
  } as CSSProperties,
  configInput: {
    width: '100%',
    padding: '7px 10px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#e0e0e8',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  } as CSSProperties,
  configConnected: {
    display: 'inline-block',
    fontSize: 9,
    padding: '1px 6px',
    borderRadius: 10,
    background: '#4ade8018',
    color: '#4ade80',
    marginLeft: 6,
    fontWeight: 600,
  } as CSSProperties,

  // Custom node styles
  node: (color: string, selected: boolean) => ({
    background: '#1a1a2e',
    border: selected ? `2px solid ${color}` : '1px solid #2a2a3e',
    borderRadius: 8,
    minWidth: 170,
    boxShadow: selected
      ? `0 0 16px ${color}30, 0 4px 12px rgba(0,0,0,0.3)`
      : '0 2px 8px rgba(0,0,0,0.25)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as CSSProperties),
  nodeHeader: (color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #252540',
    borderRadius: '7px 7px 0 0',
  } as CSSProperties),
  nodeBadge: (color: string) => ({
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 10,
    background: `${color}20`,
    color: color,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  } as CSSProperties),
  nodeName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e0e0e8',
  } as CSSProperties,
  nodePorts: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: 10,
    color: '#6a6a82',
  } as CSSProperties,
  nodePortCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  } as CSSProperties,
  nodePortLabel: (side: 'left' | 'right') => ({
    padding: '2px 10px',
    textAlign: side,
    whiteSpace: 'nowrap',
  } as CSSProperties),
  nodeHandle: (color: string) => ({
    background: color,
    width: 10,
    height: 10,
    border: `2px solid #1a1a2e`,
    boxShadow: `0 0 6px ${color}50`,
  } as CSSProperties),

  // Empty state
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#3a3a52',
    fontSize: 14,
    pointerEvents: 'none',
    zIndex: 1,
  } as CSSProperties,
  emptyStateArrow: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.4,
  } as CSSProperties,
};
