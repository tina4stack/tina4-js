# Module 1: Signals (Reactive State)

## Purpose
Minimal reactive state management. Tracks dependencies automatically.
No manual subscriptions, no store boilerplate, no reducers.

## API

```ts
// Create a reactive value
const count = signal(0);

// Read/write
count.value;        // 0
count.value = 5;    // triggers all subscribers

// Derived value (auto-tracks dependencies)
const doubled = computed(() => count.value * 2);
doubled.value;      // 10 (read-only)

// Side effect (auto-tracks dependencies)
effect(() => {
  document.title = `Count: ${count.value}`;
});
// Runs immediately, then re-runs when count changes

// Batch multiple updates (single notification)
batch(() => {
  a.value = 1;
  b.value = 2;
}); // subscribers notified once, not twice

// Cleanup
const dispose = effect(() => { ... });
dispose(); // stops the effect
```

## Implementation Sketch (~40 lines core)

```ts
let currentEffect: (() => void) | null = null;
let batchDepth = 0;
const batchQueue = new Set<() => void>();

export function signal<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();

  return {
    get value() {
      if (currentEffect) subs.add(currentEffect);
      return value;
    },
    set value(next: T) {
      if (next === value) return;
      value = next;
      if (batchDepth > 0) {
        subs.forEach(s => batchQueue.add(s));
      } else {
        subs.forEach(s => s());
      }
    },
    // For html.ts to detect signals
    _isTina4Signal: true,
    _subscribe(fn: () => void) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function computed<T>(fn: () => T) {
  const s = signal<T>(undefined as T);
  effect(() => { s.value = fn(); });
  return { get value() { return s.value; }, _isTina4Signal: true, _subscribe: s._subscribe };
}

export function effect(fn: () => void): () => void {
  const run = () => {
    currentEffect = run;
    fn();
    currentEffect = null;
  };
  run();
  return () => { currentEffect = null; }; // dispose
}

export function batch(fn: () => void) {
  batchDepth++;
  fn();
  batchDepth--;
  if (batchDepth === 0) {
    batchQueue.forEach(s => s());
    batchQueue.clear();
  }
}
```

## Size Estimate
- Raw: ~800 bytes
- Minified: ~450 bytes
- Gzipped: ~350-400 bytes

## Integration with html.ts
When a signal is interpolated in a template, html.ts creates an effect that
updates just that DOM text node or attribute. No diffing, no reconciliation.

## Integration with component.ts
Component props can be signals. When a parent passes `count` to a child,
the child automatically re-renders only the affected DOM nodes.

## Integration with tina4-php/python
Signals replace `window.tina4` global state from current Globals.ts.
State can be initialized from server-rendered JSON:

```html
<!-- Server renders this -->
<script>window.__TINA4_STATE__ = { user: { name: "Andre" } };</script>

<!-- tina4-js hydrates it -->
<script type="module">
  import { signal } from 'tina4';
  const user = signal(window.__TINA4_STATE__?.user ?? null);
</script>
```
