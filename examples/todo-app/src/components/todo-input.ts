import { Tina4Element, html, signal } from 'tina4js';
import { addTodo } from '../store';

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
