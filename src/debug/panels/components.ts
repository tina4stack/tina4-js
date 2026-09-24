// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * Components Panel — Mounted Tina4Elements inspector.
 */

import { componentTracker } from '../trackers';

export function renderComponentsPanel(): string {
  const components = componentTracker.getAll();

  if (components.length === 0) {
    return `<div class="t4-empty">No Tina4Elements mounted.<br>Custom elements extending Tina4Element will appear here.</div>`;
  }

  let rows = '';
  for (const c of components) {
    const propsStr = Object.keys(c.props).length > 0
      ? Object.entries(c.props).map(([k, v]) => `${k}=${JSON.stringify(v) ?? 'null'}`).join(', ')
      : '—';
    rows += `<tr>
      <td>&lt;${escHtml(c.tagName)}&gt;</td>
      <td>${escHtml(propsStr.length > 60 ? propsStr.slice(0, 60) + '...' : propsStr)}</td>
    </tr>`;
  }

  return `<table>
    <thead><tr><th>Element</th><th>Props</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
