/**
 * Tina4 Component — Base class for web components.
 *
 * Extends HTMLElement with reactive props, lifecycle hooks,
 * optional Shadow DOM, and scoped styles.
 */

import { signal, type Signal } from './signal';

// ── Debug Hooks (tree-shakeable — null unless debug module imported) ──

/** @internal Called when a Tina4Element is connected to the DOM. */
export let __debugComponentMount: ((el: Tina4Element) => void) | null = null;
/** @internal Called when a Tina4Element is disconnected from the DOM. */
export let __debugComponentUnmount: ((el: Tina4Element) => void) | null = null;
/** @internal Set the debug hooks. */
export function __setDebugComponentHooks(
  onMount: typeof __debugComponentMount,
  onUnmount: typeof __debugComponentUnmount,
) {
  __debugComponentMount = onMount;
  __debugComponentUnmount = onUnmount;
}

export type PropType = typeof String | typeof Number | typeof Boolean;

export abstract class Tina4Element extends HTMLElement {
  /** Declare reactive props and their types. Override in subclass. */
  static props: Record<string, PropType> = {};

  /** Scoped CSS styles. Override in subclass. */
  static styles: string = '';

  /** Use Shadow DOM (true) or light DOM (false). Override in subclass. */
  static shadow: boolean = true;

  /** Internal reactive prop signals. */
  private _props: Record<string, Signal<unknown>> = {};

  /** The render root (shadow or this). */
  private _root: ShadowRoot | HTMLElement;

  /** Track if we've rendered. */
  private _rendered = false;

  static get observedAttributes(): string[] {
    return Object.keys(this.props);
  }

  constructor() {
    super();
    const ctor = this.constructor as typeof Tina4Element;
    this._root = ctor.shadow ? this.attachShadow({ mode: 'open' }) : this;

    // Create a signal for each declared prop
    for (const [name, type] of Object.entries(ctor.props)) {
      this._props[name] = signal(this._coerce(this.getAttribute(name), type));
    }
  }

  connectedCallback(): void {
    if (this._rendered) return;
    this._rendered = true;

    const ctor = this.constructor as typeof Tina4Element;

    // Inject scoped styles into shadow root
    if (ctor.styles && ctor.shadow && this._root instanceof ShadowRoot) {
      const style = document.createElement('style');
      style.textContent = ctor.styles;
      this._root.appendChild(style);
    }

    // Render content
    const content = this.render();
    if (content) {
      this._root.appendChild(content);
    }

    this.onMount();
    if (__debugComponentMount) __debugComponentMount(this);
  }

  disconnectedCallback(): void {
    this.onUnmount();
    if (__debugComponentUnmount) __debugComponentUnmount(this);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const ctor = this.constructor as typeof Tina4Element;
    const type = ctor.props[name];
    if (type && this._props[name]) {
      this._props[name].value = this._coerce(value, type);
    }
  }

  /**
   * Get a reactive signal for a declared prop.
   *
   * ```ts
   * render() {
   *   return html`<span>${this.prop('name')}</span>`;
   * }
   * ```
   */
  prop<T = unknown>(name: string): Signal<T> {
    if (!this._props[name]) {
      throw new Error(`[tina4] Prop '${name}' not declared in static props of <${this.tagName.toLowerCase()}>`);
    }
    return this._props[name] as Signal<T>;
  }

  /**
   * Dispatch a custom event from this component.
   *
   * ```ts
   * this.emit('activate', { detail: 42 });
   * ```
   */
  emit(name: string, init?: CustomEventInit): void {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true, // crosses shadow DOM boundary
      ...init,
    }));
  }

  // ── Lifecycle hooks (override in subclass) ──────────────────────

  /** Called after first render. */
  onMount(): void {}

  /** Called when removed from DOM. */
  onUnmount(): void {}

  /** Return DOM content. Override in subclass. */
  abstract render(): DocumentFragment | Node | null;

  // ── Private ─────────────────────────────────────────────────────

  private _coerce(value: string | null, type: PropType): unknown {
    if (type === Boolean) return value !== null;
    if (type === Number) return value !== null ? Number(value) : 0;
    return value ?? '';
  }
}
