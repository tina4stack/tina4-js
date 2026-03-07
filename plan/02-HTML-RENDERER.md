# Module 2: Tagged Template Renderer (html``)

## Purpose
Convert tagged template literals into real DOM nodes with reactive bindings.
No virtual DOM, no diffing, no JSX transform.

## API

```ts
import { html, signal } from 'tina4';

const name = signal('World');

// Creates real DOM nodes
const el = html`<h1>Hello ${name}!</h1>`;
document.body.append(el);

// Signal changes update DOM surgically
name.value = 'Tina4'; // <h1> text updates, nothing else touches the DOM

// Event handlers
const onClick = () => alert('clicked');
html`<button @click=${onClick}>Click me</button>`;

// Conditional rendering
const show = signal(true);
html`<div>${() => show.value ? html`<p>Visible</p>` : null}</div>`;

// List rendering
const items = signal(['a', 'b', 'c']);
html`<ul>${() => items.value.map(i => html`<li>${i}</li>`)}</ul>`;

// Attributes
const cls = signal('active');
html`<div class=${cls}>Styled</div>`;

// Boolean attributes
const disabled = signal(false);
html`<button ?disabled=${disabled}>Submit</button>`;

// Style objects
html`<div style=${{ color: 'red', fontSize: '14px' }}>Styled</div>`;

// Nested templates
html`<div>${html`<span>Nested</span>`}</div>`;

// Raw HTML (escape hatch)
html`<div .innerHTML=${'<b>bold</b>'}></div>`;
```

## How It Works

### Step 1: Parse template (once, cached)

Tagged template literals receive `strings` (static parts) and `values` (dynamic parts).
The static parts are identical for every call with the same template — we use this
as a cache key.

```
html`<h1>Hello ${name}!</h1>`
     ^^^^^^^^^       ^^^^^^
     strings[0]      strings[1]
              ^^^^^
              values[0]
```

First call: concatenate strings with placeholder markers, parse as HTML via
`<template>`, cache the result keyed by `strings` array identity.

### Step 2: Clone and bind

Clone the cached template. Walk the DOM tree, find placeholder markers,
replace them with:
- **Text node** for content interpolation
- **Attribute** for attribute interpolation
- **Event listener** for `@event` handlers

### Step 3: Reactive binding

If a value is a signal, wrap the update in an `effect()`:

```ts
// For a text node placeholder bound to signal `name`:
effect(() => {
  textNode.data = name.value;  // auto-subscribes to name
});
```

When `name.value` changes, only that text node updates. No tree walks, no diffing.

### Step 4: Functions as dynamic regions

If a value is a function, it's treated as a computed region:

```ts
effect(() => {
  const result = fn();  // fn reads signals internally
  replaceRegion(marker, result);
});
```

This handles conditionals and lists — the function re-runs when its
signal dependencies change.

## Implementation Approach

```ts
const cache = new WeakMap<TemplateStringsArray, HTMLTemplateElement>();

export function html(strings: TemplateStringsArray, ...values: any[]): DocumentFragment {
  let template = cache.get(strings);
  if (!template) {
    template = document.createElement('template');
    // Join strings with marker comments: <!--t4:0-->, <!--t4:1-->, etc.
    template.innerHTML = strings.reduce((acc, str, i) =>
      i < values.length ? acc + str + `<!--t4:${i}-->` : acc + str, ''
    );
    cache.set(strings, template);
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  bindValues(fragment, values);
  return fragment;
}

function bindValues(root: DocumentFragment, values: any[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  let node: Comment;
  while (node = walker.nextNode() as Comment) {
    if (!node.data.startsWith('t4:')) continue;
    const index = parseInt(node.data.slice(3));
    const value = values[index];
    bindValue(node, value);
  }
  // Also process attributes with markers
  bindAttributes(root, values);
}

function bindValue(marker: Comment, value: any) {
  if (value?._isTina4Signal) {
    const text = document.createTextNode('');
    marker.replaceWith(text);
    effect(() => { text.data = String(value.value); });
  } else if (typeof value === 'function') {
    const anchor = document.createComment('');
    marker.replaceWith(anchor);
    let current: Node[] = [];
    effect(() => {
      const result = value();
      current.forEach(n => n.remove());
      current = insertAfter(anchor, result);
    });
  } else if (value instanceof DocumentFragment || value instanceof HTMLElement) {
    marker.replaceWith(value);
  } else {
    marker.replaceWith(document.createTextNode(String(value ?? '')));
  }
}
```

## Size Estimate
- Raw: ~1.2KB
- Minified: ~700B
- Gzipped: ~500-600B

## Why Not VDOM?

| Approach      | Update cost        | Memory  | Complexity |
|---------------|-------------------|---------|------------|
| Virtual DOM   | O(tree size) diff | 2x DOM  | High       |
| Signals + DOM | O(1) per signal   | 1x DOM  | Low        |

Signals give us O(1) updates because each signal knows exactly which DOM nodes
to update. No tree comparison needed.

## Twig Compatibility

For legacy tina4-php/python templates, the existing Twig renderer can still be
used alongside `html`. New components use `html`, shared templates use Twig.
A migration path: gradually replace Twig templates with `html` tagged literals.
