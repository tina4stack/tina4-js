// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { Tina4Element, html, signal } from 'tina4js';
import { addTodo } from '@/store';

class TodoInput extends Tina4Element {
  static shadow = false;
  inputText = signal('');

  render() {
    return html`
      <form class="todo-input" @submit=${(e: Event) => {
        e.preventDefault();
        addTodo(this.inputText.value);
        this.inputText.value = '';
      }}>
        <input
          type="text"
          placeholder="What needs to be done?"
          .value=${this.inputText}
          @input=${(e: Event) => {
            this.inputText.value = (e.target as HTMLInputElement).value;
          }}
        >
        <button type="submit">Add</button>
      </form>
    `;
  }
}

customElements.define('todo-input', TodoInput);
