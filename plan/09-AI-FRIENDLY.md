# Module 9: AI-Friendly Design

## The Problem

React, Vue, Angular have massive API surfaces. AI models hallucinate non-existent
props, mix up lifecycle methods, generate code that looks right but doesn't work.
The more API surface, the more mistakes.

## Design Principles for AI Engines

### 1. Minimal API Surface

The entire framework fits in one mental model:

```
signal(value)                    -- reactive state
computed(() => derived)          -- derived state
effect(() => sideEffect)         -- reactions
html`<div>${signal}</div>`       -- rendering
class X extends Tina4Element     -- components
route(path, handler)             -- routing
api.get/post/put/delete(url)     -- HTTP
```

That's it. Seven concepts. An AI can hold the entire framework in context
without needing to look up docs. Compare: React has ~50 hooks, lifecycle
methods, context patterns, and ref forwarding patterns.

### 2. Predictable Patterns (No Magic)

Every pattern follows the same shape:

```ts
// State: signal
const x = signal(0);
x.value = 1;           // always .value to read/write

// Component: class with render()
class X extends Tina4Element {
  render() { return html`...`; }
}

// Route: path + handler
route('/path', (params) => html`...`);

// API: verb + path
await api.get('/path');
```

No implicit behavior. No hidden re-renders. No stale closures.
No dependency arrays to get wrong (React useEffect).
No `$:` reactive syntax (Svelte).
No `.value` vs no `.value` confusion (Vue ref vs reactive).

### 3. Single File = Single Concept

```
src/
  components/my-card.ts     -- one component per file
  routes/index.ts           -- all routes in one file (or split by section)
  pages/home.ts             -- one page per file
```

AI can generate a complete component by producing a single file.
No need to update a router config, no need to register in a module,
no need to add to an index barrel. Auto-discovery handles it.

### 4. HTML-Native (Not a New Language)

```ts
// This is standard HTML + JS template literals
html`<div class=${cls} @click=${handler}>${text}</div>`
```

AI models are trained on billions of lines of HTML and JS.
Tagged template literals are native JS (ES2015).
No JSX transform. No `.vue` SFC parsing. No `.svelte` syntax.
Any AI that knows HTML and JS can generate tina4-js code correctly.

### 5. Convention Matches Natural Language

A user can tell an AI:
- "Create a signal called count starting at 0" -> `const count = signal(0);`
- "Make a component called UserCard" -> `class UserCard extends Tina4Element { ... }`
- "Add a route for /about" -> `route('/about', () => html\`...\`);`
- "Fetch users from the API" -> `await api.get('/users');`

The code reads like the instruction. No translation layer.

### 6. Self-Documenting Types

Full TypeScript with clear type signatures:

```ts
function signal<T>(initial: T): Signal<T>
function computed<T>(fn: () => T): ReadonlySignal<T>
function effect(fn: () => void): () => void
function html(strings: TemplateStringsArray, ...values: any[]): DocumentFragment
function route(path: string, handler: RouteHandler): void
```

AI models use type signatures as context. Clear types = correct code generation.

### 7. Error Messages That Guide

```
[tina4] Signal value accessed outside of effect() or render().
        Wrap in effect(() => { ... }) to track changes.

[tina4] Route '/user/{id}' not found. Did you mean '/users/{id}'?
        Registered routes: /, /users, /users/{id}, /about

[tina4] Component <user-card> missing required prop 'name'.
        Declared props: name (String), age (Number)
```

Clear errors help both humans AND AI debug issues.

### 8. Whole-Framework Context

At ~2KB gzipped (~5KB raw), the entire source code fits in an AI's context window.
An AI can read the full framework implementation and understand everything.

For comparison:
- React source: ~200KB of code
- Vue source: ~150KB of code
- tina4-js source: ~5KB of code

### 9. Consistent Response Format (API)

```ts
// Every API call returns the same shape
const data = await api.get('/users');     // returns parsed JSON
const data = await api.post('/users', body); // returns parsed JSON

// Errors throw with consistent shape
try {
  await api.get('/missing');
} catch (e) {
  e.status;  // 404
  e.data;    // error body
}
```

No `response.data.data` nesting (Axios). No `.then()` chains.
Clean async/await. AI generates correct error handling every time.

### 10. CLAUDE.md / AI Context File

Ship a `TINA4.md` in the project root (or as part of CLI scaffold) that serves
as an AI context file:

```markdown
# Tina4-JS Framework Context

## Quick Reference
- State: `signal(value)`, read/write via `.value`
- Render: `html\`<div>${signal}</div>\``
- Component: `class X extends Tina4Element { render() { return html\`...\`; } }`
- Route: `route('/path', (params) => html\`...\`)`
- API: `api.get/post/put/delete('/path')`
- PWA: `pwa.register({ name, themeColor, cacheStrategy })`

## File Conventions
- Components: src/components/kebab-case.ts
- Routes: src/routes/index.ts
- Pages: src/pages/kebab-case.ts

## Rules
- Always use .value to read/write signals
- Always return html`` from render()
- Route params use {name} syntax
- API calls are async/await
```

This file can be consumed by Claude Code, Cursor, Copilot, or any AI coding tool
to generate correct tina4-js code without hallucination.

## Comparison: AI Code Generation Accuracy

| Framework | Concepts to Learn | Common AI Mistakes              |
|-----------|------------------|---------------------------------|
| React     | ~50+             | Stale closures, wrong deps, hook rules |
| Vue       | ~30+             | ref vs reactive, Options vs Composition |
| Svelte    | ~20+             | $: syntax, store subscriptions  |
| tina4-js  | ~7               | (minimal surface = minimal mistakes) |

## The Pitch

"The framework an AI can learn in one prompt."
