import { route, html } from 'tina4js';
import { todoPage } from '../pages/home';

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

// 404
route('*', () => html`
  <div class="page">
    <h1>404</h1>
    <p>Page not found. <a href="/">Go home</a></p>
  </div>
`);
