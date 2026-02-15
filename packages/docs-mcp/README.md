# jam-nodes-docs-mcp

MCP (Model Context Protocol) server that exposes [jam-nodes](https://github.com/KNQuoc/jam-nodes) documentation as tools, so AI agents can query docs contextually without loading everything into context.

## Tools

| Tool | Description |
|------|-------------|
| `search_docs` | Keyword search across all documentation |
| `get_node_info` | Full docs for a specific node by type (e.g. `http_request`) |
| `list_nodes` | List all 16 built-in nodes with descriptions |
| `get_api_reference` | API docs for core types, registry, execution context, editor |
| `get_guide` | Get the creating-nodes guide or quick start |

## Installation

```bash
npm install -g jam-nodes-docs-mcp
```

Or run directly:

```bash
npx jam-nodes-docs-mcp
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jam-nodes-docs": {
      "command": "npx",
      "args": ["jam-nodes-docs-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "jam-nodes-docs": {
      "command": "npx",
      "args": ["jam-nodes-docs-mcp"]
    }
  }
}
```

### OpenClaw

Add to your MCP config:

```json
{
  "jam-nodes-docs": {
    "command": "npx",
    "args": ["jam-nodes-docs-mcp"]
  }
}
```

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT © KNQuoc
