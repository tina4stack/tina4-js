import { describe, it, expect, vi, afterEach } from 'vitest';
import { signal, computed, effect } from '../src/core/signal';
import { html } from '../src/core/html';
import { Tina4Element } from '../src/core/component';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('integration: todo list', () => {
  it('adds and removes items reactively', () => {
    const items = signal<string[]>(['Buy milk']);

    function addItem(text: string) {
      items.value = [...items.value, text];
    }

    function removeItem(index: number) {
      items.value = items.value.filter((_, i) => i !== index);
    }

    const view = html`
      <ul>${() => items.value.map((item, i) =>
        html`<li>${item} <button @click=${() => removeItem(i)}>x</button></li>`
      )}</ul>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    expect(container.querySelectorAll('li').length).toBe(1);

    addItem('Walk dog');
    expect(container.querySelectorAll('li').length).toBe(2);

    addItem('Code tina4');
    expect(container.querySelectorAll('li').length).toBe(3);

    // Remove first item
    container.querySelector('button')?.click();
    expect(container.querySelectorAll('li').length).toBe(2);
  });
});

describe('integration: form binding', () => {
  it('two-way data flow with input and computed greeting', () => {
    const name = signal('');
    const greeting = computed(() => name.value ? `Hello, ${name.value}!` : 'Enter your name');

    const view = html`
      <div>
        <input type="text" @input=${(e: Event) => {
          name.value = (e.target as HTMLInputElement).value;
        }}>
        <p>${greeting}</p>
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    const p = container.querySelector('p')!;
    expect(p.textContent).toBe('Enter your name');

    const input = container.querySelector('input')!;
    input.value = 'Andre';
    input.dispatchEvent(new Event('input'));
    expect(p.textContent).toBe('Hello, Andre!');
  });
});

describe('integration: conditional rendering', () => {
  it('toggles login/logout UI based on state', () => {
    const loggedIn = signal(false);
    const username = signal('Guest');

    const view = html`
      <div>
        ${() => loggedIn.value
          ? html`<p class="welcome">Welcome, ${username}!</p><button class="logout" @click=${() => { loggedIn.value = false; }}>Logout</button>`
          : html`<button class="login" @click=${() => { loggedIn.value = true; username.value = 'Andre'; }}>Login</button>`
        }
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    // Initially logged out
    expect(container.querySelector('.welcome')).toBeNull();
    expect(container.querySelector('.login')).toBeTruthy();

    // Click login
    container.querySelector<HTMLButtonElement>('.login')?.click();
    expect(container.querySelector('.welcome')?.textContent).toContain('Andre');
    expect(container.querySelector('.login')).toBeNull();

    // Click logout
    container.querySelector<HTMLButtonElement>('.logout')?.click();
    expect(container.querySelector('.welcome')).toBeNull();
    expect(container.querySelector('.login')).toBeTruthy();
  });
});

describe('integration: counter component', () => {
  it('full lifecycle with increment and decrement', () => {
    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();
    let tagCounter = 100;
    const tag = `int-counter-${++tagCounter}`;

    class Counter extends Tina4Element {
      count = signal(0);
      static shadow = false;

      render() {
        return html`
          <div>
            <span class="count">${this.count}</span>
            <button class="inc" @click=${() => this.count.value++}>+</button>
            <button class="dec" @click=${() => this.count.value--}>-</button>
          </div>
        `;
      }
      onMount() { mountSpy(); }
      onUnmount() { unmountSpy(); }
    }

    if (!customElements.get(tag)) {
      customElements.define(tag, Counter);
    }

    const el = document.createElement(tag) as Counter;
    document.body.appendChild(el);

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.count')?.textContent).toBe('0');

    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('1');

    el.querySelector<HTMLButtonElement>('.inc')?.click();
    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('3');

    el.querySelector<HTMLButtonElement>('.dec')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('2');

    document.body.removeChild(el);
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });
});

describe('integration: derived state chain', () => {
  it('signal → computed → computed → effect → DOM', () => {
    const price = signal(100);
    const taxRate = signal(0.15);
    const tax = computed(() => price.value * taxRate.value);
    const total = computed(() => price.value + tax.value);

    const view = html`
      <div>
        <span class="price">${price}</span>
        <span class="tax">${tax}</span>
        <span class="total">${total}</span>
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    expect(container.querySelector('.price')?.textContent).toBe('100');
    expect(container.querySelector('.tax')?.textContent).toBe('15');
    expect(container.querySelector('.total')?.textContent).toBe('115');

    price.value = 200;
    expect(container.querySelector('.price')?.textContent).toBe('200');
    expect(container.querySelector('.tax')?.textContent).toBe('30');
    expect(container.querySelector('.total')?.textContent).toBe('230');

    taxRate.value = 0.2;
    expect(container.querySelector('.tax')?.textContent).toBe('40');
    expect(container.querySelector('.total')?.textContent).toBe('240');
  });
});
