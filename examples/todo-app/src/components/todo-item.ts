// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { Tina4Element, html, signal } from 'tina4js';
import { toggleTodo, removeTodo } from '@/store';

class TodoItem extends Tina4Element {
  static props = { todoId: Number, text: String, done: Boolean };
  static shadow = false;

  render() {
    return html`
      <li class="todo-item" ?data-done=${this.prop('done')}>
        <label>
          <input
            type="checkbox"
            ?checked=${this.prop('done')}
            @change=${() => toggleTodo(this.prop('todoId').value as number)}
          >
          <span>${this.prop('text')}</span>
        </label>
        <button
          class="remove"
          @click=${() => removeTodo(this.prop('todoId').value as number)}
        >&times;</button>
      </li>
    `;
  }
}

customElements.define('todo-item', TodoItem);
