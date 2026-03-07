# Module 10: Implementation Roadmap

## Phase 1: Core (Week 1)
**Goal: Reactive rendering works end-to-end**

1. `signal.ts` — signal(), computed(), effect(), batch()
2. `html.ts` — tagged template renderer with signal bindings
3. `component.ts` — Tina4Element base class
4. Unit tests for all three
5. Single-file ESM output (`tina4.core.esm.js`)

**Deliverable:** You can create reactive web components with zero build tools.
```html
<script type="module">
  import { signal, html, Tina4Element } from './tina4.core.esm.js';
  // works
</script>
```

## Phase 2: Router + API (Week 2)
**Goal: Full SPA capability**

1. `router.ts` — history + hash mode, params, guards, lazy loading
2. `fetch.ts` — API client with auth, interceptors
3. Integration tests (router renders components, API feeds signals)
4. Full ESM output (`tina4.esm.js`)

**Deliverable:** Complete SPA framework in <3KB gzip.

## Phase 3: PWA + CLI (Week 3)
**Goal: Project scaffolding and PWA**

1. `pwa.ts` — manifest generation, SW registration, cache strategies
2. CLI: `tina4 create`, `tina4 dev`, `tina4 build`
3. Project templates (minimal, pwa, php, python)
4. Vite integration for dev/build

**Deliverable:** `npx tina4 create my-app` produces a working project.

## Phase 4: Integration (Week 4)
**Goal: Works inside tina4-php and tina4-python**

1. PHP build target (output to `src/public/js/`, generate `index.twig`)
2. Python build target (output + catch-all route)
3. Islands mode (hydrate components in server-rendered pages)
4. Auth flow testing with real tina4-php/python backends
5. TINA4.md AI context file generation

**Deliverable:** Drop tina4-js into an existing tina4-php/python project.

## Phase 5: Polish (Week 5)
**Goal: Production-ready**

1. CDN build (IIFE + ESM)
2. TypeScript declarations (`.d.ts`)
3. npm publish
4. Documentation site (built with tina4-js, of course)
5. Bundle size CI check (fail if >3KB gzip)
6. Example apps (todo, blog, dashboard)

## File Creation Order

```
# Phase 1
src/core/signal.ts
src/core/html.ts
src/core/component.ts
src/index.ts                 # barrel export
tests/signal.test.ts
tests/html.test.ts
tests/component.test.ts

# Phase 2
src/router/router.ts
src/api/fetch.ts
tests/router.test.ts
tests/fetch.test.ts

# Phase 3
src/pwa/pwa.ts
cli/create.ts
cli/dev.ts
cli/build.ts
templates/minimal/
templates/pwa/
templates/php/
templates/python/

# Phase 4
cli/targets/php.ts
cli/targets/python.ts
examples/php-embedded/
examples/python-embedded/
examples/islands/

# Phase 5
TINA4.md
docs/
examples/todo/
examples/blog/
```

## Success Criteria

- [ ] `signal()` + `effect()` work correctly (auto-tracking, cleanup)
- [ ] `html` tagged templates produce real DOM with reactive bindings
- [ ] `Tina4Element` web components render and react to prop changes
- [ ] Router handles history/hash mode with params and guards
- [ ] API client manages auth tokens compatible with tina4-php/python
- [ ] PWA manifest + service worker auto-generated
- [ ] CLI scaffolds working project
- [ ] Total core bundle < 3KB gzipped
- [ ] Works via CDN `<script type="module">` with zero build tools
- [ ] Full TypeScript support with published type declarations
- [ ] AI context file (TINA4.md) enables accurate code generation
- [ ] Embedded mode works in both tina4-php and tina4-python
