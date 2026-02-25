import { searchSections, getNodeInfo, listNodes, getApiReference, getGuide } from './docs.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOLS: Tool[] = [
  {
    name: 'search_docs',
    description: 'Search jam-nodes documentation by keywords. Returns relevant sections from all docs (core API, nodes, editor, guides).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (keywords or natural language)' },
        maxResults: { type: 'number', description: 'Maximum number of results (default: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_node_info',
    description: 'Get full documentation for a specific built-in jam-nodes node by its type identifier (e.g. "http_request", "conditional", "filter").',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Node type identifier (e.g. "http_request", "conditional", "map")' },
      },
      required: ['type'],
    },
  },
  {
    name: 'list_nodes',
    description: 'List all 16 built-in jam-nodes nodes with their type, name, category, and brief description.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_api_reference',
    description: 'Get jam-nodes API reference for a specific area. Areas: "core", "types", "registry", "execution-context", "editor", "workflow-runner", "schema-introspector", "nodes".',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'API area to look up' },
      },
      required: ['area'],
    },
  },
  {
    name: 'get_guide',
    description: 'Get a jam-nodes guide. Available guides: "creating-nodes" (custom node guide), "quick-start" (overview), "editor" (visual editor).',
    inputSchema: {
      type: 'object',
      properties: {
        guide: { type: 'string', description: 'Guide name: "creating-nodes", "quick-start", or "editor"' },
      },
      required: ['guide'],
    },
  },
];

export function handleTool(name: string, args: Record<string, unknown>): { content: Array<{ type: 'text'; text: string }> } {
  switch (name) {
    case 'search_docs': {
      const query = args.query as string;
      const maxResults = (args.maxResults as number) || 10;
      const results = searchSections(query, maxResults);
      if (results.length === 0) {
        return { content: [{ type: 'text', text: `No results found for "${query}".` }] };
      }
      const text = results.map(s =>
        `## ${s.title} (${s.source})\n\n${s.content}`
      ).join('\n\n---\n\n');
      return { content: [{ type: 'text', text }] };
    }

    case 'get_node_info': {
      const type = args.type as string;
      const info = getNodeInfo(type);
      if (!info) {
        const nodes = listNodes();
        const available = nodes.map(n => n.type).join(', ');
        return { content: [{ type: 'text', text: `Node type "${type}" not found. Available types: ${available}` }] };
      }
      const text = info.fullDoc || `# ${info.name} (\`${info.type}\`)\n\n**Category:** ${info.category}\n\n${info.description}`;
      return { content: [{ type: 'text', text }] };
    }

    case 'list_nodes': {
      const nodes = listNodes();
      const byCategory: Record<string, typeof nodes> = {};
      for (const n of nodes) {
        (byCategory[n.category] ??= []).push(n);
      }
      let text = '# Built-in Nodes\n\n';
      for (const [cat, catNodes] of Object.entries(byCategory)) {
        text += `## ${cat}\n\n`;
        for (const n of catNodes) {
          text += `- **\`${n.type}\`** — ${n.name}: ${n.description}\n`;
        }
        text += '\n';
      }
      return { content: [{ type: 'text', text }] };
    }

    case 'get_api_reference': {
      const area = args.area as string;
      const ref = getApiReference(area);
      if (!ref) {
        return { content: [{ type: 'text', text: `No API reference found for "${area}". Try: core, types, registry, execution-context, editor, workflow-runner, schema-introspector, nodes.` }] };
      }
      return { content: [{ type: 'text', text: ref }] };
    }

    case 'get_guide': {
      const guide = args.guide as string;
      const content = getGuide(guide);
      if (!content) {
        return { content: [{ type: 'text', text: `Guide "${guide}" not found. Available: "creating-nodes", "quick-start", "editor".` }] };
      }
      return { content: [{ type: 'text', text: content }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
}
