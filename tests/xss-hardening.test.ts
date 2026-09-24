// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, afterEach } from 'vitest';
import { html } from '../src/core/html';
import { signal } from '../src/core/signal';

afterEach(() => { document.body.innerHTML = ''; });

describe('A1: attribute interpolation keeps static text', () => {
  it('preserves the static prefix around a hole', () => {
    const id = 'alice';
    const frag = html`<a href="/users/${id}">x</a>`;
    expect((frag.firstElementChild as HTMLAnchorElement).getAttribute('href')).toBe('/users/alice');
  });

  it('substitutes multiple holes in one attribute', () => {
    const frag = html`<a href="/u/${'a'}/p/${'b'}">x</a>`;
    expect((frag.firstElementChild as HTMLElement).getAttribute('href')).toBe('/u/a/p/b');
  });

  it('reactive hole keeps the static text on update', () => {
    const id = signal('1');
    const frag = html`<a href="/users/${id}">x</a>`;
    const a = frag.firstElementChild as HTMLElement;
    expect(a.getAttribute('href')).toBe('/users/1');
    id.value = '2';
    expect(a.getAttribute('href')).toBe('/users/2');
  });
});

describe('A2: URL attribute sanitising', () => {
  it('refuses a javascript: href', () => {
    const frag = html`<a href="${'javascript:alert(1)'}">x</a>`;
    expect((frag.firstElementChild as HTMLElement).getAttribute('href')).toBe('');
  });

  it('refuses an obfuscated javascript: scheme', () => {
    const frag = html`<a href="${'java\tscript:alert(1)'}">x</a>`;
    expect((frag.firstElementChild as HTMLElement).getAttribute('href')).toBe('');
  });

  it('refuses data: except data:image/*', () => {
    const bad = html`<img src="${'data:text/html,<script>1</script>'}">`;
    expect((bad.firstElementChild as HTMLElement).getAttribute('src')).toBe('');
    const ok = html`<img src="${'data:image/png;base64,AAAA'}">`;
    expect((ok.firstElementChild as HTMLElement).getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('allows a normal relative url', () => {
    const frag = html`<a href="${'/shop'}">x</a>`;
    expect((frag.firstElementChild as HTMLElement).getAttribute('href')).toBe('/shop');
  });

  it('ignores an on* attribute binding', () => {
    const frag = html`<div onclick="${'alert(1)'}">x</div>`;
    expect((frag.firstElementChild as HTMLElement).hasAttribute('onclick')).toBe(false);
  });
});

import { route, router, navigate, rawHtml, _resetRouter } from '../src/router/router';

describe('R1/R3/R4: router hardening', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    _resetRouter();
    history.replaceState(null, '', '/');
    location.hash = '';
  });

  it('R1: a string handler result is rendered as text, not HTML', async () => {
    route('/', () => '<img src=x onerror="alert(1)">');
    router.start({ target: '#root', mode: 'hash' });
    await new Promise(r => setTimeout(r, 0));
    const root = document.querySelector('#root')!;
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('<img');
  });

  it('R1: rawHtml() opt-in renders trusted HTML', async () => {
    route('/', () => rawHtml('<b class="ok">hi</b>'));
    router.start({ target: '#root', mode: 'hash' });
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('#root b.ok')).not.toBeNull();
  });

  it('R3: an async guard that resolves false blocks the route', async () => {
    let rendered = false;
    route('/', { guard: async () => false, handler: () => { rendered = true; return 'x'; } });
    router.start({ target: '#root', mode: 'hash' });
    await new Promise(r => setTimeout(r, 10));
    expect(rendered).toBe(false);
  });

  it('R4: a malformed percent escape does not throw', async () => {
    route('/item/{id}', ({ id }) => rawHtml(`<span id="v">${id === '%E0%A4%A' ? 'raw' : id}</span>`));
    router.start({ target: '#root', mode: 'hash' });
    location.hash = '/item/%E0%A4%A';
    await new Promise(r => setTimeout(r, 10));
    expect(document.querySelector('#root #v')).not.toBeNull();
  });
});

describe('A3: fragment detection uses a real brand', () => {
  it('a plain object with nodeType 11 is not adopted as a fragment', () => {
    const fake = { nodeType: 11, childNodes: [], textContent: 'x' } as unknown;
    // Rendered inside a template, the fake is coerced to text, not spread as a
    // DocumentFragment. It must appear as its string form, not inject children.
    const frag = html`<div>${fake}</div>`;
    const div = frag.firstElementChild as HTMLElement;
    expect(div.querySelector('*')).toBeNull();
    expect(div.textContent).toContain('[object Object]');
  });

  it('a real DocumentFragment is still adopted', () => {
    const real = html`<span class="x">hi</span>`;
    const frag = html`<div>${real}</div>`;
    expect((frag.firstElementChild as HTMLElement).querySelector('span.x')).not.toBeNull();
  });
});
