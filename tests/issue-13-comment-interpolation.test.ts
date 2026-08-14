import { describe, expect, it } from 'vitest';
import { html } from '../src/core/html';

describe('issue #13 — HTML comments do not change interpolation context', () => {
  it('renders content after a comment containing an apostrophe', () => {
    const fragment = html`<!-- developer's note --><p>${'visible'}</p>`;

    expect(fragment.querySelector('p')?.textContent).toBe('visible');
  });

  it('renders content after a comment containing a double quote', () => {
    const fragment = html`<!-- developer "note" --><p>${'visible'}</p>`;

    expect(fragment.querySelector('p')?.textContent).toBe('visible');
  });

  it('still binds an attribute after a comment containing quotes', () => {
    const fragment = html`<!-- developer's "note" --><p class=${'ready'}>Visible</p>`;

    expect(fragment.querySelector('p')?.className).toBe('ready');
  });
});
