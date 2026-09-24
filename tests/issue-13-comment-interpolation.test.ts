// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

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
