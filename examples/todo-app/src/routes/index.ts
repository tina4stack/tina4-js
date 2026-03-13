import { route, html, signal } from 'tina4js';
import { todoPage } from '../pages/home';
import { todos } from '../store';

// Main todo page
route('/', todoPage);

// About page
route('/about', () => html`
  <div class="page about">
    <h1>About</h1>
    <p>A todo app built with <strong>tina4-js</strong> — a sub-3KB reactive framework.</p>
    <ul>
      <li>Signals for state management</li>
      <li>Tagged template literals for rendering</li>
      <li>Web Components for reusable UI</li>
      <li>Client-side routing</li>
    </ul>
    <p><a href="/">Back to todos</a></p>
  </div>
`);

// Single todo detail (tests param routes)
route('/todo/{id}', (params: { id: string }) => {
  const todo = todos.value.find(t => t.id === Number(params.id));
  if (!todo) {
    return html`
      <div class="page">
        <h1>Todo not found</h1>
        <p>Todo #${params.id} doesn't exist. <a href="/">Go back</a></p>
      </div>
    `;
  }
  return html`
    <div class="page">
      <h1>Todo #${todo.id}</h1>
      <p class="todo-detail ${todo.done ? 'done' : ''}">${todo.text}</p>
      <p>Status: ${todo.done ? 'Completed' : 'Active'}</p>
      <a href="/">← Back to list</a>
    </div>
  `;
});

// Settings page (tests sync route)
const theme = signal('dark');
route('/settings', () => html`
  <div class="page settings">
    <h1>Settings</h1>
    <div class="setting-row">
      <label>Theme</label>
      <select @change=${(e: Event) => { theme.value = (e.target as HTMLSelectElement).value; }}>
        <option value="dark" ?selected=${() => theme.value === 'dark'}>Dark</option>
        <option value="light" ?selected=${() => theme.value === 'light'}>Light</option>
      </select>
    </div>
    <div class="setting-row">
      <label>Total todos</label>
      <span>${() => todos.value.length}</span>
    </div>
    <p>Current theme: <strong>${() => theme.value}</strong></p>
    <a href="/">← Back to todos</a>
  </div>
`);

// Async page (tests async handler)
route('/async-page', async () => {
  // Simulate async data loading
  await new Promise(resolve => setTimeout(resolve, 500));
  const timestamp = new Date().toLocaleTimeString();
  return html`
    <div class="page">
      <h1>Async Page</h1>
      <p>This page was loaded asynchronously.</p>
      <p>Loaded at: <strong>${timestamp}</strong></p>
      <p>Current todo count: <strong>${() => todos.value.length}</strong></p>
      <a href="/">← Back to todos</a>
    </div>
  `;
});

// Guarded route (tests route guards)
route('/admin', {
  handler: () => html`
    <div class="page">
      <h1>Admin Panel</h1>
      <p>You have access because you have at least one completed todo.</p>
      <a href="/">← Back to todos</a>
    </div>
  `,
  guard: () => {
    const hasCompleted = todos.value.some(t => t.done);
    if (!hasCompleted) return '/';  // redirect to home
    return true;
  }
});

// Notes page — textarea bound to a signal for debug testing
const noteText = signal('', 'noteText');
const charCount = signal(0, 'charCount');
route('/notes', () => html`
  <div class="page">
    <h1>Notes</h1>
    <p>Type below and watch signals update in the debug overlay (Ctrl+Shift+D)</p>
    <textarea
      rows="6"
      style="width:100%;font-size:16px;padding:12px;border:1px solid #ddd;border-radius:8px;resize:vertical;"
      placeholder="Start typing to see signals react..."
      @input=${(e: Event) => {
        noteText.value = (e.target as HTMLTextAreaElement).value;
        charCount.value = noteText.value.length;
      }}
    ></textarea>
    <p>Characters: <strong>${charCount}</strong></p>
    <p>Preview: <em>${() => noteText.value || '(empty)'}</em></p>
    <a href="/">← Back to todos</a>
  </div>
`);

// 404
route('*', () => html`
  <div class="page">
    <h1>404</h1>
    <p>Page not found. <a href="/">Go home</a></p>
  </div>
`);
