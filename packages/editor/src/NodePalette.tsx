import React, { useState, useMemo } from 'react';
import type { NodeRegistry, NodeCategory, NodeMetadata } from '@jam-nodes/core';
import { CATEGORY_COLORS, s } from './styles';

const CATEGORIES: NodeCategory[] = ['action', 'logic', 'integration', 'transform'];

interface Props {
  registry: NodeRegistry;
}

export function NodePalette({ registry }: Props) {
  const [search, setSearch] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const all = registry.getAllMetadata();
    const lq = search.toLowerCase();
    const filtered = lq ? all.filter(m => m.name.toLowerCase().includes(lq) || m.type.toLowerCase().includes(lq)) : all;
    const map: Record<string, NodeMetadata[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const m of filtered) (map[m.category] ??= []).push(m);
    return map;
  }, [registry, search]);

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/jam-node-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={s.palette as React.CSSProperties}>
      <input
        placeholder="🔍  Search nodes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={s.paletteSearch as React.CSSProperties}
      />
      {CATEGORIES.map(cat => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        const color = CATEGORY_COLORS[cat];
        return (
          <div key={cat}>
            <div style={s.paletteCat as React.CSSProperties}>{cat}</div>
            {items.map(m => {
              const isHovered = hoveredItem === m.type;
              return (
                <div
                  key={m.type}
                  draggable
                  onDragStart={e => onDragStart(e, m.type)}
                  onMouseEnter={() => setHoveredItem(m.type)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    ...s.paletteItem as React.CSSProperties,
                    borderLeftColor: isHovered ? color : 'transparent',
                    background: isHovered ? '#1a1a2e' : 'transparent',
                  }}
                >
                  <div style={s.paletteItemRow as React.CSSProperties}>
                    <span style={s.paletteDot(color)} />
                    <span style={s.paletteItemName}>{m.name}</span>
                  </div>
                  {m.description && (
                    <div style={s.paletteItemDesc as React.CSSProperties}>{m.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
