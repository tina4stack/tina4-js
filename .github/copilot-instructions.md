# tina4-js Copilot Instructions

Sub-3KB core, reactive JavaScript framework. Zero dependencies.

## Signal API — .value Property Access

```javascript
const count = signal(0);
count.value = 5;        // write
count.value;            // read
// NEVER use count() or count(5) — function-call syntax does NOT exist
```

## Template Rules

- `${count}` — reactive binding (signal itself)
- `${count.value}` — WRONG: evaluates once, never updates
- `${() => condition ? html\`...\` : null}` — reactive conditional
- `?disabled=${loading}` — boolean attribute (NOT `disabled=${loading}`)
- `@click=${fn}` — event handler (NOT `onclick=${fn}`)
- Arrays: `items.value = [...items.value, newItem]` (NOT `.push()`)

## Key APIs

- `route(pattern, handler)` — pattern first, always
- `api.configure({baseUrl})` then `api.get(path)` — singleton, not constructor
- `ws.connect(url)` — not `ws(url)`

For the complete API reference, read `CLAUDE.md` in this repo and the docs it links. `llms.txt` is the link index (llmstxt.org format); https://tina4.com/llms-full.txt has the full documentation in one file.
