import { html, signal, computed } from 'tina4js';
import {
  todos, filter, filteredTodos, remaining, totalCount,
  addTodo, toggleAll, clearCompleted,
  type Filter,
} from '../store';

export function todoPage() {
  return html`
    <div class="todo-app">
      <header>
        <h1>todos</h1>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/notes">Notes</a>
        </nav>
      </header>

      <todo-input></todo-input>

      ${() => totalCount.value > 0 ? html`
        <section class="main">
          <label class="toggle-all-label">
            <input
              type="checkbox"
              class="toggle-all"
              ?checked=${() => remaining.value === 0}
              @change=${() => toggleAll()}
            >
            Mark all as complete
          </label>

          <ul class="todo-list">
            ${() => filteredTodos.value.map(todo => html`
              <todo-item
                todoId="${todo.id}"
                text="${todo.text}"
                ?done=${todo.done}
              ></todo-item>
            `)}
          </ul>
        </section>

        <footer class="footer">
          <span class="count">
            ${() => `${remaining.value} item${remaining.value !== 1 ? 's' : ''} left`}
          </span>

          <div class="filters">
            ${(['all', 'active', 'completed'] as Filter[]).map(f => html`
              <button
                class="${() => filter.value === f ? 'selected' : ''}"
                @click=${() => { filter.value = f; }}
              >${f}</button>
            `)}
          </div>

          ${() => totalCount.value - remaining.value > 0
            ? html`<button class="clear" @click=${() => clearCompleted()}>Clear completed</button>`
            : null
          }
        </footer>
      ` : html`
        <p class="empty">Add your first todo above!</p>
      `}
    </div>
  `;
}
