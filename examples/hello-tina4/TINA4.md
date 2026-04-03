# Tina4-JS Framework Context

> This file helps AI coding tools (Claude Code, Cursor, Copilot) generate correct tina4-js code.

## Quick Reference

| Concept | Code |
|---------|------|
| State | `const x = signal(value)` — read/write via `.value` |
| Derived | `const d = computed(() => x.value * 2)` — read-only, auto-tracks |
| Effect | `effect(() => { /* runs when signals change */ })` |
| Render | `html\`<div>\${signal}</div>\`` — returns real DOM nodes |
| Component | `class X extends Tina4Element { render() { return html\`...\`; } }` |
| Route | `route('/path', (params) => html\`...\`)` |
| Navigate | `navigate('/path')` |
| API | `await api.get('/path')`, `.post`, `.put`, `.patch`, `.delete` |
| PWA | `pwa.register({ name, themeColor, cacheStrategy })` |

## File Conventions

- Components: `src/components/kebab-case.ts`
- Routes: `src/routes/index.ts`
- Pages: `src/pages/kebab-case.ts`
- Static files: `src/public/`
- Styles: `src/public/css/`

## Rules

1. Always use `.value` to read/write signals
2. Always return `html\`...\`` from `render()` and route handlers
3. Route params use `{name}` syntax: `route('/user/{id}', ({ id }) => ...)`
4. Event handlers use `@` prefix: `@click=\${handler}`, `@input=\${handler}`
5. Boolean attrs use `?` prefix: `?disabled=\${signal}`
6. API calls are async/await
7. Components extend `Tina4Element` and must call `customElements.define()`
8. Use `static props = { name: String }` for component attributes
9. Use `static styles = \`css\`` for scoped styles (Shadow DOM)
10. Use `static shadow = false` for light DOM components

## Signal Patterns

```ts
// Create
const count = signal(0);

// Read
count.value; // 0

// Write (triggers DOM updates)
count.value = 5;

// Derived (auto-updates)
const doubled = computed(() => count.value * 2);

// Side effect
effect(() => console.log(count.value));

// Batch multiple updates
batch(() => { a.value = 1; b.value = 2; }); // one notification

// In templates — signals interpolate directly
html\`<span>\${count}</span>\`; // auto-updates when count changes
```

## Component Pattern

```ts
import { Tina4Element, html, signal } from 'tina4js';

class MyWidget extends Tina4Element {
  static props = { label: String, count: Number, active: Boolean };
  static styles = \`:host { display: block; }\`;

  // Internal state
  expanded = signal(false);

  render() {
    return html\`
      <div>
        <span>\${this.prop('label')}: \${this.prop('count')}</span>
        <button @click=\${() => this.expanded.value = !this.expanded.value}>
          \${() => this.expanded.value ? 'Less' : 'More'}
        </button>
        \${() => this.expanded.value ? html\`<slot></slot>\` : null}
      </div>
    \`;
  }

  onMount() { /* connected to DOM */ }
  onUnmount() { /* removed from DOM */ }
}

customElements.define('my-widget', MyWidget);
```

## Router Pattern

```ts
import { route, router, navigate, html } from 'tina4js';

route('/', () => html\`<h1>Home</h1>\`);
route('/user/{id}', ({ id }) => html\`<h1>User \${id}</h1>\`);
route('/admin', { guard: () => isLoggedIn() || '/login', handler: () => html\`<h1>Admin</h1>\` });
route('*', () => html\`<h1>404</h1>\`);

router.start({ target: '#root', mode: 'hash' }); // or mode: 'history'
navigate('/user/42');
```

## API Pattern (tina4-php/python compatible)

```ts
import { api } from 'tina4js';

api.configure({ baseUrl: '/api', auth: true });

const users = await api.get('/users');
const user = await api.get('/users/{id}', { id: 42 });
await api.post('/users', { name: 'Andre' });
await api.put('/users/42', { name: 'Updated' });
await api.delete('/users/42');

// Interceptors
api.intercept('request', (config) => { config.headers['X-Custom'] = 'val'; return config; });
api.intercept('response', (res) => { if (res.status === 401) navigate('/login'); return res; });
```

## Conditional & List Rendering

```ts
// Conditional — use a function that returns html or null
html\`\${() => show.value ? html\`<p>Visible</p>\` : null}\`;

// List — use a function that maps to html templates
html\`<ul>\${() => items.value.map(i => html\`<li>\${i}</li>\`)}</ul>\`;
```

## Framework Size

| Module | Gzipped |
|--------|---------|
| Core (signals + html + component) | 2.44 KB |
| Router | 1.13 KB |
| API | 0.82 KB |
| PWA | 1.13 KB |
