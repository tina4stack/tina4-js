import { Tina4Element, html, signal } from 'tina4js';
import { toggleTodo, removeTodo } from '../store';

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
