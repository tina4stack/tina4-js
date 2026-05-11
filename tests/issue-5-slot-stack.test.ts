/**
 * Regression test for tina4-js#5 — outer reactive slot does not tear down
 * the previous subtree when it re-fires; children stack instead of replacing.
 *
 * Reported by justin-k-bruce. Real-world impact: JWT refresh signal updates
 * caused chained signal writes, every cycle stacked another copy of the
 * page chrome on top of the old one. Visible after ~30min AFK.
 */

import { describe, it, expect } from 'vitest';
import { html, signal, effect } from '../src/core';

describe('issue #5 — reactive slot subtree replacement', () => {
  it('outer ${() => html`...`} slot replaces its subtree on signal update', () => {
    const flag = signal(true);

    const tree = html`
      <div id="root">
        ${() =>
          flag.value
            ? html`<p class="banner">Banner A</p>`
            : html`<p class="banner">Banner B</p>`}
      </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(tree);

    const initial = document.querySelectorAll('.banner');
    expect(initial.length).toBe(1);
    expect(initial[0].textContent).toBe('Banner A');

    // Flip 10 times — count must stay at exactly 1 (current state's banner).
    for (let i = 0; i < 10; i++) {
      flag.value = !flag.value;
      const count = document.querySelectorAll('.banner').length;
      expect(count, `after flip ${i + 1}: banners stacked instead of replaced`).toBe(1);
    }
  });

  it('chained signal updates (JWT-refresh shape) do not stack the chrome', () => {
    // Mirrors justin-k-bruce's real-world scenario: a "token" signal rewritten
    // periodically causes a "loadedId" signal to flip, which an outer reactive
    // slot reads. The slot must replace, not stack.
    const token = signal('initial-token');
    const loadedId = signal(1);

    // Chain: when token changes, bump loadedId — simulating a load() side-effect.
    // We don't use effect() here because we're testing the html-level behavior,
    // not the effect chain; but if effect() chains caused stacking, the same
    // shape would be visible by directly setting both signals.
    const tree = html`
      <div id="root">
        ${() => html`
          <header class="chrome">
            <p>Loaded id: ${() => String(loadedId.value)}</p>
          </header>
        `}
      </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(tree);

    expect(document.querySelectorAll('.chrome').length).toBe(1);

    // Bump the signal the outer slot reads — even though the function
    // re-evaluates and produces a fresh DocumentFragment each time, the
    // old subtree must be removed first.
    for (let cycle = 0; cycle < 5; cycle++) {
      loadedId.value = loadedId.value + 1;
      const chromeCount = document.querySelectorAll('.chrome').length;
      expect(chromeCount, `cycle ${cycle}: chrome stacked at ${chromeCount}`).toBe(1);
    }
  });

  it('chained user-effect → domain-signal → slot re-fire (JWT shape)', () => {
    // The full real-world chain Justin described:
    //
    //   1. token signal rewritten every cycle
    //   2. user effect() subscribes to token, writes to domain signal
    //   3. outer reactive slot subscribes to domain signal
    //   4. expect slot to REPLACE, not stack
    //
    // This shape exercises the effect-collector / disposer plumbing in
    // a way a simple direct signal write does not — the effect-from-effect
    // ordering might create stale subscription edges that previous fixes
    // missed.
    const token = signal('t0');
    const domain = signal(1);
    let loadCounter = 0;

    // Chain: token → domain. The effect reads token (subscribes) and
    // writes a derived value to domain. Crucially we DON'T read domain
    // inside the effect — that would create a self-loop. Real-world
    // load() functions compute the new value from the token / request,
    // not from the current domain value.
    effect(() => {
      const _ = token.value;
      loadCounter += 1;
      domain.value = loadCounter;
    });

    const tree = html`
      <div id="root">
        ${() => html`<header class="chrome">Loaded #${() => String(domain.value)}</header>`}
      </div>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(tree);

    expect(document.querySelectorAll('.chrome').length).toBe(1);

    // Simulate 30 minutes of token refreshes (compressed)
    for (let cycle = 0; cycle < 30; cycle++) {
      token.value = `t${cycle + 1}`;
      const chromeCount = document.querySelectorAll('.chrome').length;
      expect(
        chromeCount,
        `cycle ${cycle}: chrome stacked at ${chromeCount} (was 1 expected)`,
      ).toBe(1);
    }
  });

  it('nested signal in re-fired slot updates in place', () => {
    // Subtle case: when the outer slot re-fires AND emits new html that
    // itself contains a nested reactive expression, the inner effects
    // must be disposed (no leak) AND the new inner expression must
    // bind to the now-current node.
    const outer = signal(0);
    const inner = signal('hello');

    const tree = html`
      <div id="root">
        ${() => html`<span class="leaf" data-outer="${() => String(outer.value)}">${inner}</span>`}
      </div>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(tree);

    expect(document.querySelectorAll('.leaf').length).toBe(1);
    expect(document.querySelector('.leaf')?.textContent).toBe('hello');

    // Re-fire outer slot — new <span> should replace old one
    outer.value = 1;
    expect(document.querySelectorAll('.leaf').length).toBe(1);

    // Inner signal should still update the current node, not a detached one
    inner.value = 'world';
    expect(document.querySelector('.leaf')?.textContent).toBe('world');

    // And after another outer re-fire, inner reactivity still works on the
    // brand-new node (no stale effect pointing at the removed previous one)
    outer.value = 2;
    expect(document.querySelectorAll('.leaf').length).toBe(1);
    inner.value = 'fresh';
    expect(document.querySelector('.leaf')?.textContent).toBe('fresh');
  });
});
