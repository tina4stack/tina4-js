# AI Context Files — tina4-js

## Status

tina4-js is a frontend-only framework (sub-3KB). It does NOT have an `ai` CLI module
like the 4 backend frameworks. Its AI context files are maintained manually.

## Files

- `CLAUDE.md` — Full developer guide for Claude Code
- `.cursorrules` — Compact patterns for Cursor IDE
- `.github/copilot-instructions.md` — Short instructions for GitHub Copilot
- `llms.txt` — LLM-friendly reference documentation

## Maintenance

When tina4-js features change, update these files manually. The backend frameworks
generate theirs from `generate_context(tool_name)` — tina4-js does not have this
because it's a JS library, not a CLI application.

## Cross-Reference

The 4 backend frameworks' AI installers (`tina4python ai`, `bin/tina4php ai`, etc.)
each produce per-tool context. See their `plan/AI-CONTEXT.md` for architecture details.
