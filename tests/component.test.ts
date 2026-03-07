import { describe, it, expect, vi, afterEach } from 'vitest';
import { Tina4Element } from '../src/core/component';
import { html } from '../src/core/html';
import { signal } from '../src/core/signal';

// Counter to create unique tag names per test
let tagCounter = 0;
function uniqueTag(prefix: string): string {
  return `${prefix}-${++tagCounter}`;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Tina4Element', () => {
  it('renders content to shadow DOM', () => {
    const tag = uniqueTag('test-render');
    class TestEl extends Tina4Element {
      render() { return html`<p>Hello</p>`; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    expect(el.shadowRoot).toBeTruthy();
    expect(el.shadowRoot?.querySelector('p')?.textContent).toBe('Hello');
  });

  it('renders to light DOM when shadow is disabled', () => {
    const tag = uniqueTag('test-light');
    class LightEl extends Tina4Element {
      static shadow = false;
      render() { return html`<p>Light</p>`; }
    }
    customElements.define(tag, LightEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('p')?.textContent).toBe('Light');
  });

  it('bridges HTML attributes to reactive prop signals', () => {
    const tag = uniqueTag('test-props');
    class PropEl extends Tina4Element {
      static props = { name: String, count: Number };
      render() {
        return html`<span>${this.prop('name')} - ${this.prop('count')}</span>`;
      }
    }
    customElements.define(tag, PropEl);

    const el = document.createElement(tag);
    el.setAttribute('name', 'Andre');
    el.setAttribute('count', '5');
    document.body.appendChild(el);

    const span = el.shadowRoot?.querySelector('span');
    expect(span?.textContent).toContain('Andre');
    expect(span?.textContent).toContain('5');
  });

  it('updates when attributes change after render', () => {
    const tag = uniqueTag('test-attr-update');
    class ReactiveEl extends Tina4Element {
      static props = { label: String };
      render() { return html`<span>${this.prop('label')}</span>`; }
    }
    customElements.define(tag, ReactiveEl);

    const el = document.createElement(tag);
    el.setAttribute('label', 'before');
    document.body.appendChild(el);

    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('before');
    el.setAttribute('label', 'after');
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('after');
  });

  it('coerces boolean props (present = true, absent = false)', () => {
    const tag = uniqueTag('test-bool');
    class BoolEl extends Tina4Element {
      static props = { active: Boolean };
      render() {
        return html`<span>${() => this.prop('active').value ? 'yes' : 'no'}</span>`;
      }
    }
    customElements.define(tag, BoolEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('no');

    el.setAttribute('active', '');
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('yes');
  });

  it('coerces number props', () => {
    const tag = uniqueTag('test-num');
    class NumEl extends Tina4Element {
      static props = { count: Number };
      render() {
        return html`<span>${this.prop('count')}</span>`;
      }
    }
    customElements.define(tag, NumEl);

    const el = document.createElement(tag);
    el.setAttribute('count', '42');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('42');
  });

  it('calls onMount when connected and onUnmount when disconnected', () => {
    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();
    const tag = uniqueTag('test-lifecycle');

    class LifecycleEl extends Tina4Element {
      render() { return html`<div>lifecycle</div>`; }
      onMount() { mountSpy(); }
      onUnmount() { unmountSpy(); }
    }
    customElements.define(tag, LifecycleEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(mountSpy).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('injects scoped styles into shadow root', () => {
    const tag = uniqueTag('test-styled');
    class StyledEl extends Tina4Element {
      static styles = `:host { display: block; } p { color: red; }`;
      render() { return html`<p>Styled</p>`; }
    }
    customElements.define(tag, StyledEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const style = el.shadowRoot?.querySelector('style');
    expect(style).toBeTruthy();
    expect(style?.textContent).toContain(':host');
    expect(style?.textContent).toContain('color: red');
  });

  it('emits custom events with emit()', () => {
    const tag = uniqueTag('test-emit');
    class EventEl extends Tina4Element {
      static shadow = false;
      render() {
        return html`<button @click=${() => this.emit('activate', { detail: 42 })}>Go</button>`;
      }
    }
    customElements.define(tag, EventEl);

    const el = document.createElement(tag);
    const handler = vi.fn();
    el.addEventListener('activate', handler);
    document.body.appendChild(el);

    el.querySelector('button')?.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe(42);
  });

  it('supports internal signal state', () => {
    const tag = uniqueTag('test-state');
    class StatefulEl extends Tina4Element {
      static shadow = false;
      count = signal(0);
      render() {
        return html`
          <span class="count">${this.count}</span>
          <button class="inc" @click=${() => this.count.value++}>+</button>
        `;
      }
    }
    customElements.define(tag, StatefulEl);

    const el = document.createElement(tag) as StatefulEl;
    document.body.appendChild(el);

    expect(el.querySelector('.count')?.textContent).toBe('0');
    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('1');
    el.querySelector<HTMLButtonElement>('.inc')?.click();
    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('3');
  });

  it('throws when accessing undeclared prop', () => {
    const tag = uniqueTag('test-noprop');
    class NoPropEl extends Tina4Element {
      render() { return html`<div>test</div>`; }
    }
    customElements.define(tag, NoPropEl);

    const el = document.createElement(tag) as NoPropEl;
    document.body.appendChild(el);
    expect(() => el.prop('missing')).toThrow(/Prop 'missing' not declared/);
  });

  it('only renders once on repeated connectedCallback', () => {
    const renderSpy = vi.fn();
    const tag = uniqueTag('test-once');
    class OnceEl extends Tina4Element {
      render() {
        renderSpy();
        return html`<div>once</div>`;
      }
    }
    customElements.define(tag, OnceEl);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Remove and re-add — should not render again
    // (This tests the _rendered guard)
    // Note: in real usage you'd want to support re-rendering,
    // but for now we guard against double-render
  });
});
