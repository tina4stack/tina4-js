/**
 * Regression test for tina4-js#16 — a reactive hole placed directly in a
 * fragment returned by an outer reactive hole left its nodes in the DOM when
 * the outer hole re-rendered, if the inner hole filled in AFTER the outer one
 * rendered. Each outer re-render left one more stale copy behind.
 *
 * The outer hole only remembered the node list it inserted, so nodes a nested
 * hole inserted later (next to its own anchor, as siblings of the outer
 * hole's nodes) were never removed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { html, signal } from '../src/core';

describe('issue #16 — nested hole that fills in late is cleaned up by its parent hole', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root')!;
  });

  it('removes a late-filled nested hole when the outer hole re-renders (issue repro)', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`${() => (parent.value, html`<p>panel</p>${() => (show.value ? html`<b>late</b>` : null)}`)}`);

    show.value = true;   // nested hole fills in AFTER its parent rendered
    parent.value = 1;    // parent re-renders

    expect(root.querySelectorAll('p').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(1);
  });

  it('leaves exactly one copy after several re-renders in a row', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`${() => (parent.value, html`<p>panel</p>${() => (show.value ? html`<b>late</b>` : null)}`)}`);

    for (let i = 1; i <= 5; i++) {
      show.value = false;
      show.value = true;   // fill in late on every cycle
      parent.value = i;
      expect(root.querySelectorAll('p').length, `cycle ${i}`).toBe(1);
      expect(root.querySelectorAll('b').length, `cycle ${i}`).toBe(1);
    }
  });

  it('cleans up a nested hole that leads the fragment (inserts before the first node)', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`${() => (parent.value, html`${() => (show.value ? html`<b>late</b>` : null)}<p>panel</p>`)}`);

    show.value = true;
    parent.value = 1;
    parent.value = 2;

    expect(root.querySelectorAll('p').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(1);
  });

  it('cleans up a late-filled hole nested two holes deep', () => {
    const show = signal(false), mid = signal(0), parent = signal(0);
    root.append(html`${() => (parent.value, html`<p>panel</p>${() => (mid.value, html`<i>mid</i>${() => (show.value ? html`<b>late</b>` : null)}`)}`)}`);

    show.value = true;
    parent.value = 1;
    show.value = false;
    show.value = true;
    mid.value = 1;
    parent.value = 2;

    expect(root.querySelectorAll('p').length).toBe(1);
    expect(root.querySelectorAll('i').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(1);
  });

  it('element-wrapped nested hole still works', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`${() => (parent.value, html`<p>panel</p><div>${() => (show.value ? html`<b>late</b>` : null)}</div>`)}`);

    show.value = true;
    parent.value = 1;
    parent.value = 2;

    expect(root.querySelectorAll('p').length).toBe(1);
    expect(root.querySelectorAll('div').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(1);
  });

  it('removes the nested nodes when the nested hole empties again', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`${() => (parent.value, html`<p>panel</p>${() => (show.value ? html`<b>late</b>` : null)}`)}`);

    show.value = true;
    expect(root.querySelectorAll('b').length).toBe(1);
    show.value = false;
    expect(root.querySelectorAll('b').length).toBe(0);

    show.value = true;
    parent.value = 1;
    show.value = false;
    expect(root.querySelectorAll('p').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(0);
  });

  it('keeps sibling content outside the hole intact', () => {
    const show = signal(false), parent = signal(0);
    root.append(html`<h1>before</h1>${() => (parent.value, html`<p>panel</p>${() => (show.value ? html`<b>late</b>` : null)}`)}<h2>after</h2>`);

    show.value = true;
    parent.value = 1;

    expect(root.querySelectorAll('h1').length).toBe(1);
    expect(root.querySelectorAll('h2').length).toBe(1);
    expect(root.querySelectorAll('b').length).toBe(1);
    expect(root.textContent).toBe('beforepanellateafter');
  });
});
