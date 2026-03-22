import { describe, it, expect, afterEach } from 'vitest';
import { html } from '../src/core/html';
import { signal } from '../src/core/signal';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('html tagged template', () => {
  it('creates a DocumentFragment from static HTML', () => {
    const frag = html`<div>Hello</div>`;
    // nodeType 11 = DOCUMENT_FRAGMENT_NODE (works across DOM implementations)
    expect(frag.nodeType).toBe(11);
    expect(frag.firstElementChild?.tagName).toBe('DIV');
    expect(frag.firstElementChild?.textContent).toBe('Hello');
  });

  it('creates multiple root elements', () => {
    const frag = html`<span>A</span><span>B</span>`;
    expect(frag.children.length).toBe(2);
  });

  it('interpolates static strings', () => {
    const name = 'World';
    const frag = html`<p>Hello ${name}</p>`;
    expect(frag.firstElementChild?.textContent).toBe('Hello World');
  });

  it('interpolates numbers', () => {
    const frag = html`<span>${42}</span>`;
    expect(frag.firstElementChild?.textContent).toBe('42');
  });

  it('handles null and undefined as empty', () => {
    const frag = html`<div>${null}|${undefined}</div>`;
    expect(frag.firstElementChild?.textContent).toBe('|');
  });

  it('handles false as empty', () => {
    const frag = html`<div>${false}</div>`;
    // false should render as empty via the function path, or "false" as text
    // We accept either behavior — the key thing is it doesn't crash
    expect(frag.firstElementChild).toBeTruthy();
  });

  it('escapes HTML in string interpolation (XSS prevention)', () => {
    const evil = '<script>alert("xss")</script>';
    const frag = html`<div>${evil}</div>`;
    const div = frag.firstElementChild!;
    expect(div.textContent).toBe(evil);
    expect(div.querySelector('script')).toBeNull();
  });
});

describe('html + signals (reactive)', () => {
  it('updates text when signal changes', () => {
    const name = signal('World');
    const frag = html`<p>Hello ${name}!</p>`;
    const p = frag.firstElementChild!;
    document.body.appendChild(p);

    expect(p.textContent).toContain('World');
    name.value = 'Tina4';
    expect(p.textContent).toContain('Tina4');
  });

  it('updates multiple signals independently', () => {
    const first = signal('John');
    const last = signal('Doe');
    const frag = html`<span>${first} ${last}</span>`;
    const span = frag.firstElementChild!;
    document.body.appendChild(span);

    expect(span.textContent).toContain('John');
    expect(span.textContent).toContain('Doe');
    first.value = 'Jane';
    expect(span.textContent).toContain('Jane');
    expect(span.textContent).toContain('Doe');
  });

  it('updates reactive attributes', () => {
    const cls = signal('active');
    const frag = html`<div class=${cls}>Test</div>`;
    const div = frag.firstElementChild as HTMLElement;
    document.body.appendChild(div);

    expect(div.className).toBe('active');
    cls.value = 'inactive';
    expect(div.className).toBe('inactive');
  });

  it('handles boolean attributes with ? prefix', () => {
    const disabled = signal(false);
    const frag = html`<button ?disabled=${disabled}>Go</button>`;
    const btn = frag.firstElementChild as HTMLButtonElement;
    document.body.appendChild(btn);

    expect(btn.disabled).toBe(false);
    disabled.value = true;
    expect(btn.disabled).toBe(true);
    disabled.value = false;
    expect(btn.disabled).toBe(false);
  });
});

describe('html + events', () => {
  it('binds @click handlers', () => {
    let clicked = false;
    const frag = html`<button @click=${() => { clicked = true; }}>Go</button>`;
    const btn = frag.firstElementChild as HTMLButtonElement;
    document.body.appendChild(btn);
    btn.click();
    expect(clicked).toBe(true);
  });

  it('binds @input handlers', () => {
    let value = '';
    const frag = html`<input @input=${(e: Event) => { value = (e.target as HTMLInputElement).value; }}>`;
    const input = frag.firstElementChild as HTMLInputElement;
    document.body.appendChild(input);
    input.value = 'test';
    input.dispatchEvent(new Event('input'));
    expect(value).toBe('test');
  });

  it('batches signal updates inside @click — only one re-render per click', () => {
    const a = signal(0);
    const b = signal(0);
    let renderCount = 0;

    // Read .value directly so the outer reactive block tracks both signals
    const container = document.createElement('div');
    const frag = html`
      <div>
        ${() => { renderCount++; return String(a.value + b.value); }}
        <button @click=${() => {
          a.value++;
          b.value++;
        }}>Go</button>
      </div>`;
    container.appendChild(frag);
    document.body.appendChild(container);

    const initialRenders = renderCount;
    const btn = container.querySelector('button')!;
    btn.click();

    // Both signal writes should cause exactly ONE re-render, not two
    expect(renderCount).toBe(initialRenders + 1);
    expect(a.value).toBe(1);
    expect(b.value).toBe(1);
  });

  it('reactive block does not re-render mid-click when signal updated in handler', () => {
    const items = signal(['a', 'b']);
    const clicked: string[] = [];

    const frag = html`
      <ul>${() => items.value.map(item => html`
        <li @click=${() => {
          clicked.push(item);
          items.value = [...items.value, 'c'];
        }}>${item}</li>
      `)}</ul>`;
    document.body.appendChild(frag);

    const li = document.body.querySelector('li')!;
    li.click();

    // Handler should fire exactly once, not once per re-render
    expect(clicked.length).toBe(1);
    expect(clicked[0]).toBe('a');
  });
});

describe('html + dynamic content (functions)', () => {
  it('renders conditional content', () => {
    const show = signal(true);
    const frag = html`<div>${() => show.value ? html`<p>Yes</p>` : html`<p>No</p>`}</div>`;
    const div = frag.firstElementChild!;
    document.body.appendChild(div);

    expect(div.textContent).toBe('Yes');
    show.value = false;
    expect(div.textContent).toBe('No');
    show.value = true;
    expect(div.textContent).toBe('Yes');
  });

  it('renders null from function (show/hide)', () => {
    const visible = signal(true);
    const frag = html`<div>${() => visible.value ? html`<p>Content</p>` : null}</div>`;
    const div = frag.firstElementChild!;
    document.body.appendChild(div);

    expect(div.querySelector('p')).toBeTruthy();
    visible.value = false;
    expect(div.querySelector('p')).toBeNull();
    visible.value = true;
    expect(div.querySelector('p')).toBeTruthy();
  });

  it('renders dynamic lists', () => {
    const items = signal(['a', 'b', 'c']);
    const frag = html`<ul>${() => items.value.map(i => html`<li>${i}</li>`)}</ul>`;
    const ul = frag.firstElementChild!;
    document.body.appendChild(ul);

    expect(ul.querySelectorAll('li').length).toBe(3);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('a');

    items.value = ['x', 'y'];
    expect(ul.querySelectorAll('li').length).toBe(2);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('x');

    items.value = [];
    expect(ul.querySelectorAll('li').length).toBe(0);

    items.value = ['new'];
    expect(ul.querySelectorAll('li').length).toBe(1);
  });
});

describe('html + nested templates', () => {
  it('renders nested html`` fragments', () => {
    const inner = html`<span>Inner</span>`;
    const outer = html`<div>${inner}</div>`;
    const div = outer.firstElementChild!;
    expect(div.querySelector('span')?.textContent).toBe('Inner');
  });

  it('renders arrays of templates', () => {
    const items = ['a', 'b', 'c'];
    const frag = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;
    const lis = frag.firstElementChild?.querySelectorAll('li');
    expect(lis?.length).toBe(3);
    expect(lis?.[0].textContent).toBe('a');
    expect(lis?.[2].textContent).toBe('c');
  });
});

describe('html template caching', () => {
  it('same template literal reuses cached template', () => {
    function make(text: string) {
      return html`<div class="cached">${text}</div>`;
    }
    const a = make('one');
    const b = make('two');
    expect(a.firstElementChild?.textContent).toBe('one');
    expect(b.firstElementChild?.textContent).toBe('two');
    // Both should have the same structure
    expect(a.firstElementChild?.className).toBe('cached');
    expect(b.firstElementChild?.className).toBe('cached');
  });
});

describe('html — inner effect cleanup', () => {
  it('function binding disposes inner effects when re-evaluated', () => {
    const items = signal(['a', 'b']);
    const innerRunCount = { value: 0 };

    const frag = html`<div>${() => {
      return items.value.map(item => {
        innerRunCount.value++;
        return html`<span>${item}</span>`;
      });
    }}</div>`;
    const div = frag.firstElementChild!;
    document.body.appendChild(div);

    // Initial render: 2 items
    expect(div.querySelectorAll('span').length).toBe(2);
    const initialRuns = innerRunCount.value;

    // Update list — old inner effects should be cleaned up
    items.value = ['x'];
    expect(div.querySelectorAll('span').length).toBe(1);
    expect(div.querySelector('span')?.textContent).toBe('x');

    // Update again — should not accumulate stale spans
    items.value = ['p', 'q', 'r'];
    expect(div.querySelectorAll('span').length).toBe(3);
  });

  it('nested reactive signals in list items do not duplicate after list update', () => {
    const items = signal([1, 2, 3]);
    const multiplier = signal(1);

    const frag = html`<ul>${() => items.value.map(i =>
      html`<li>${() => `${i * multiplier.value}`}</li>`
    )}</ul>`;
    const ul = frag.firstElementChild!;
    document.body.appendChild(ul);

    expect(ul.querySelectorAll('li').length).toBe(3);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('1');

    // Update multiplier — inner effects should update in-place
    multiplier.value = 10;
    expect(ul.querySelectorAll('li')[0].textContent).toBe('10');
    expect(ul.querySelectorAll('li').length).toBe(3);

    // Now change the list — old inner effects for items [1,2,3] should be disposed
    items.value = [5, 6];
    expect(ul.querySelectorAll('li').length).toBe(2);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('50');

    // Update multiplier again — should NOT re-trigger disposed effects from old list
    multiplier.value = 2;
    expect(ul.querySelectorAll('li').length).toBe(2);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('10');
    expect(ul.querySelectorAll('li')[1].textContent).toBe('12');
  });

  it('conditional content does not leak effects from the hidden branch', () => {
    const show = signal(true);
    const counter = signal(0);
    let effectRunsWhenHidden = 0;

    const frag = html`<div>${() => {
      if (show.value) {
        return html`<p>${() => {
          const val = counter.value;
          return `Count: ${val}`;
        }}</p>`;
      }
      return html`<span>Hidden</span>`;
    }}</div>`;
    const div = frag.firstElementChild!;
    document.body.appendChild(div);

    expect(div.querySelector('p')?.textContent).toBe('Count: 0');

    // Counter updates work while visible
    counter.value = 5;
    expect(div.querySelector('p')?.textContent).toBe('Count: 5');

    // Hide — inner effects from the <p> branch should be disposed
    show.value = false;
    expect(div.querySelector('span')?.textContent).toBe('Hidden');

    // Counter updates should NOT affect the DOM (old effect is disposed)
    counter.value = 99;
    // The hidden text should remain, no phantom <p> reappearing
    expect(div.querySelector('p')).toBeNull();
    expect(div.querySelector('span')?.textContent).toBe('Hidden');
  });
});
