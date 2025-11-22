#!/bin/bash
# Project-specific Serena MCP launcher for claude-skill-ado project
# This script ensures Serena runs with the correct project context

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Run Serena MCP server using uv with project dependencies
exec uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project "$PROJECT_ROOT" --context desktop-app --transport stdio "$@"
