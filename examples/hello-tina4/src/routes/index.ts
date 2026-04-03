import { route, navigate, html, signal, computed } from 'tina4js';
import { homePage } from '../pages/home';

// Home
route('/', homePage);

// About
route('/about', () => html`
  <div class="page">
    <h1>About</h1>
    <p>Built with <a href="https://github.com/tina4stack/tina4-js">tina4-js</a> — a sub-3KB reactive framework.</p>
    <a href="/">Back home</a>
  </div>
`);

// 404
route('*', () => html`
  <div class="page">
    <h1>404</h1>
    <p>Page not found.</p>
    <a href="/">Go home</a>
  </div>
`);
