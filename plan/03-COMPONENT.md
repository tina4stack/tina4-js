# Module 3: Tina4Element (Web Component Base Class)

## Purpose
Thin base class for creating web components with reactive rendering.
Extends native `HTMLElement` — works everywhere, no framework lock-in.

## API

```ts
import { Tina4Element, html, signal } from 'tina4';

class UserCard extends Tina4Element {
  // Reactive props (auto-synced with HTML attributes)
  static props = { name: String, age: Number, active: Boolean };

  // Internal state
  expanded = signal(false);

  // Styles (scoped to this component via Shadow DOM)
  static styles = `
    :host { display: block; padding: 1rem; }
    .name { font-weight: bold; }
  `;

  render() {
    return html`
      <div class="name">${this.prop('name')}</div>
      <p>Age: ${this.prop('age')}</p>
      <button @click=${() => this.expanded.value = !this.expanded.value}>
        ${() => this.expanded.value ? 'Less' : 'More'}
      </button>
      ${() => this.expanded.value ? html`<slot></slot>` : null}
    `;
  }

  onMount() { /* component connected to DOM */ }
  onUnmount() { /* component removed from DOM */ }
}

customElements.define('user-card', UserCard);
```

Usage in HTML:
```html
<user-card name="Andre" age="35" active>
  <p>Extra content shown when expanded</p>
</user-card>
```

## Implementation

```ts
export class Tina4Element extends HTMLElement {
  private _props: Record<string, ReturnType<typeof signal>> = {};
  private _root: ShadowRoot | this;

  // Subclass defines observed props with types
  static props: Record<string, typeof String | typeof Number | typeof Boolean> = {};
  static styles: string = '';
  static shadow: boolean = true; // opt-out with `static shadow = false`

  static get observedAttributes() {
    return Object.keys(this.props);
  }

  constructor() {
    super();
    const ctor = this.constructor as typeof Tina4Element;

    // Initialize shadow DOM or light DOM
    this._root = ctor.shadow ? this.attachShadow({ mode: 'open' }) : this;

    // Create signal for each declared prop
    for (const [name, type] of Object.entries(ctor.props)) {
      this._props[name] = signal(this._coerce(this.getAttribute(name), type));
    }
  }

  connectedCallback() {
    const ctor = this.constructor as typeof Tina4Element;

    // Inject scoped styles
    if (ctor.styles && ctor.shadow) {
      const style = document.createElement('style');
      style.textContent = ctor.styles;
      (this._root as ShadowRoot).appendChild(style);
    }

    // Render
    const content = this.render();
    if (content) this._root.appendChild(content);

    this.onMount();
  }

  disconnectedCallback() {
    this.onUnmount();
  }

  attributeChangedCallback(name: string, _old: string, value: string) {
    const ctor = this.constructor as typeof Tina4Element;
    const type = ctor.props[name];
    if (type && this._props[name]) {
      this._props[name].value = this._coerce(value, type);
    }
  }

  // Get a reactive prop signal
  prop(name: string) {
    return this._props[name];
  }

  // Override in subclass
  render(): DocumentFragment | null { return null; }
  onMount() {}
  onUnmount() {}

  private _coerce(value: string | null, type: any) {
    if (type === Boolean) return value !== null;
    if (type === Number) return Number(value);
    return value ?? '';
  }
}
```

## Features

### Props -> Signals Bridge
HTML attributes automatically become reactive signals. When a parent changes
an attribute, the child's DOM updates surgically via the signal system.

```html
<!-- Parent changes name attribute -->
<user-card name="NewName"></user-card>
<!-- child's render() never re-runs — only the text node bound to name updates -->
```

### Shadow DOM (Default) or Light DOM
- Shadow DOM: styles are scoped, no CSS bleed, `<slot>` for content projection
- Light DOM: `static shadow = false` — styles are global, useful for tina4-php/python
  server-rendered pages where you want the component to inherit page styles

### Lifecycle
- `onMount()` — called when component enters the DOM (fetch data, start timers)
- `onUnmount()` — called when removed (cleanup subscriptions, timers)
- `attributeChangedCallback` — handled automatically via prop signals

### Events (Custom)
```ts
class MyButton extends Tina4Element {
  render() {
    return html`
      <button @click=${() => this.emit('activate', { detail: 42 })}>
        Go
      </button>
    `;
  }
}
// Parent listens:
html`<my-button @activate=${(e) => console.log(e.detail)}></my-button>`;
```

`emit()` is a helper on `Tina4Element` that dispatches a `CustomEvent`.

## Size Estimate
- Raw: ~600B
- Minified: ~350B
- Gzipped: ~250-300B

## Integration with tina4-php/python

Web components work in ANY HTML page — no build step required for consumption.
A tina4-php Twig template can use them directly:

```twig
{# Server-rendered Twig template #}
<script type="module" src="/js/tina4.esm.js"></script>
<user-card name="{{ user.name }}" age="{{ user.age }}">
  <p>{{ user.bio }}</p>
</user-card>
```

The server renders the HTML attributes, tina4-js hydrates the component.
This is the "islands" pattern — reactive components in a server-rendered page.
