# jam-nodes-docs-mcp

MCP (Model Context Protocol) server that exposes [jam-nodes](https://github.com/wespreadjam/jam-nodes) documentation as tools, so AI agents can query docs contextually without loading everything into context.

## Tools

| Tool | Description |
|------|-------------|
| `search_docs` | Keyword search across all documentation |
| `get_node_info` | Full docs for a specific node by type (e.g. `http_request`) |
| `list_nodes` | List all built-in nodes with descriptions |
| `get_api_reference` | API docs for core types, registry, execution context |
| `get_guide` | Get the creating-nodes guide or quick start |

## Configuration

This package is not yet published to npm. To use it, build locally first.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jam-nodes-docs": {
      "command": "node",
      "args": ["<path-to-repo>/packages/docs-mcp/dist/index.js"]
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
      "command": "node",
      "args": ["<path-to-repo>/packages/docs-mcp/dist/index.js"]
    }
  }
}
```

## Development

```bash
pnpm install
pnpm build
node dist/index.js
```

## License

MIT — see root [LICENSE](../../LICENSE)
