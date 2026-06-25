import { describe, it, expect, vi } from 'vitest';
import { signal, effect } from '../src/core/signal';
import { html } from '../src/core/html';

/**
 * Issue #6 — an effect() created inside another effect (or inside a reactive
 * template hole) must be disposed when its owner re-runs or is disposed.
 * Before the fix, such a child effect kept its signal subscriptions after the
 * parent/subtree unmounted and re-fired on every later signal change.
 */
describe('issue #6 — owned effects are disposed with their parent', () => {
  it('disposes a child effect when the parent effect is disposed', () => {
    const parentDep = signal(0);
    const innerDep = signal(0);
    const innerRuns = vi.fn();

    const stopParent = effect(() => {
      parentDep.value; // parent dependency
      effect(() => {
        innerDep.value; // child dependency
        innerRuns();
      });
    });

    expect(innerRuns).toHaveBeenCalledTimes(1);

    stopParent(); // disposing the parent must dispose the child it owns

    innerDep.value = 1; // would re-fire a leaked child effect
    expect(innerRuns).toHaveBeenCalledTimes(1);
  });

  it('disposes the previous child effect when the parent re-runs (no stacking)', () => {
    const parentDep = signal(0);
    const innerDep = signal(0);
    const innerRuns = vi.fn();

    effect(() => {
      parentDep.value;
      effect(() => {
        innerDep.value;
        innerRuns();
      });
    });

    expect(innerRuns).toHaveBeenCalledTimes(1);

    parentDep.value = 1; // parent re-runs: old child disposed, one new child created
    expect(innerRuns).toHaveBeenCalledTimes(2);

    innerDep.value = 5; // exactly ONE live child should react — not a stale stack
    expect(innerRuns).toHaveBeenCalledTimes(3);
  });

  it('stops an effect inside a template hole after its subtree unmounts', () => {
    const show = signal(true);
    const data = signal(0);
    const ran = vi.fn();

    const frag = html`<div>${() =>
      show.value
        ? html`<span>${() => {
            effect(() => { data.value; ran(); });
            return 'live';
          }}</span>`
        : 'gone'
    }</div>`;
    document.body.appendChild(frag);

    expect(ran).toHaveBeenCalledTimes(1);

    show.value = false; // ancestor hole re-renders → child subtree unmounts
    const callsAfterUnmount = ran.mock.calls.length;

    data.value = 1; // must NOT re-fire the now-unmounted effect
    expect(ran.mock.calls.length).toBe(callsAfterUnmount);
  });
});
