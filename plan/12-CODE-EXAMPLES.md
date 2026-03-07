# Module 12: Code Examples

Real-world examples showing how tina4-js would be used in practice.

---

## Example 1: Todo App (Standalone)

```ts
// src/main.ts
import { signal, computed, html, route, router } from 'tina4';

// --- State ---
const todos = signal<{ text: string; done: boolean }[]>([]);
const filter = signal<'all' | 'active' | 'done'>('all');

const filtered = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.done);
  if (filter.value === 'done') return todos.value.filter(t => t.done);
  return todos.value;
});

const remaining = computed(() => todos.value.filter(t => !t.done).length);

// --- Actions ---
function addTodo(text: string) {
  todos.value = [...todos.value, { text, done: false }];
}

function toggleTodo(index: number) {
  todos.value = todos.value.map((t, i) =>
    i === index ? { ...t, done: !t.done } : t
  );
}

function removeTodo(index: number) {
  todos.value = todos.value.filter((_, i) => i !== index);
}

// --- View ---
route('/', () => html`
  <div class="todo-app">
    <h1>Todos</h1>

    <form @submit=${(e: Event) => {
      e.preventDefault();
      const input = (e.target as HTMLFormElement).querySelector('input')!;
      if (input.value.trim()) {
        addTodo(input.value.trim());
        input.value = '';
      }
    }}>
      <input type="text" placeholder="What needs to be done?">
      <button type="submit">Add</button>
    </form>

    <div class="filters">
      <button @click=${() => filter.value = 'all'}>All</button>
      <button @click=${() => filter.value = 'active'}>Active</button>
      <button @click=${() => filter.value = 'done'}>Done</button>
    </div>

    <ul>
      ${() => filtered.value.map((todo, i) => html`
        <li class=${() => todo.done ? 'done' : ''}>
          <input type="checkbox"
            ?checked=${todo.done}
            @change=${() => toggleTodo(i)}>
          <span>${todo.text}</span>
          <button @click=${() => removeTodo(i)}>x</button>
        </li>
      `)}
    </ul>

    <p>${remaining} items remaining</p>
  </div>
`);

router.start({ target: '#root', mode: 'hash' });
```

---

## Example 2: Dashboard with API (Embedded in tina4-php)

```ts
// src/main.ts
import { signal, html, route, router, api, Tina4Element } from 'tina4';

// Configure API (talks to tina4-php backend on same origin)
api.configure({
  baseUrl: '/api',
  auth: true,
});

// --- State ---
const user = signal(window.__TINA4_STATE__?.user ?? null);
const stats = signal({ users: 0, orders: 0, revenue: 0 });
const loading = signal(true);

// --- Data Loading ---
async function loadDashboard() {
  loading.value = true;
  try {
    stats.value = await api.get('/dashboard/stats');
  } finally {
    loading.value = false;
  }
}

// --- Components ---
class StatCard extends Tina4Element {
  static props = { label: String, value: String };
  static styles = `
    :host { display: block; padding: 1rem; border-radius: 8px; background: var(--card-bg, #f5f5f5); }
    .value { font-size: 2rem; font-weight: bold; }
    .label { color: #666; font-size: 0.875rem; }
  `;

  render() {
    return html`
      <div class="value">${this.prop('value')}</div>
      <div class="label">${this.prop('label')}</div>
    `;
  }
}
customElements.define('stat-card', StatCard);

// --- Routes ---
route('/', () => {
  loadDashboard();
  return html`
    <div class="dashboard">
      <h1>Welcome back, ${() => user.value?.name ?? 'User'}</h1>

      ${() => loading.value
        ? html`<p>Loading...</p>`
        : html`
          <div class="stats-grid">
            <stat-card label="Total Users" value=${() => String(stats.value.users)}></stat-card>
            <stat-card label="Orders" value=${() => String(stats.value.orders)}></stat-card>
            <stat-card label="Revenue" value=${() => '$' + stats.value.revenue}></stat-card>
          </div>
        `
      }
    </div>
  `;
});

route('/login', () => html`
  <form class="login-form" @submit=${async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    try {
      const result = await api.post('/auth/login', {
        username: data.get('username'),
        password: data.get('password'),
      });
      user.value = result.user;
      navigate('/');
    } catch (err) {
      alert('Login failed');
    }
  }}>
    <h1>Login</h1>
    <input name="username" placeholder="Username" required>
    <input name="password" type="password" placeholder="Password" required>
    <button type="submit">Sign In</button>
  </form>
`);

route('/users', {
  guard: () => user.value ? true : '/login',
  handler: async () => {
    const users = signal<any[]>([]);
    users.value = await api.get('/users');

    return html`
      <h1>Users</h1>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
        <tbody>
          ${() => users.value.map(u => html`
            <tr>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td><a href="/users/${u.id}">View</a></td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  },
});

route('/users/{id}', async ({ id }) => {
  const user = signal(await api.get('/users/{id}', { id }));
  return html`
    <h1>${() => user.value.name}</h1>
    <p>Email: ${() => user.value.email}</p>
    <a href="/users">Back to list</a>
  `;
});

router.start({ target: '#root', mode: 'history' });
```

**Corresponding tina4-php backend:**
```php
// src/routes/api.php
\Tina4\Get::add('/api/dashboard/stats', function(\Tina4\Response $response) {
    return $response(["users" => 1250, "orders" => 89, "revenue" => 12500]);
});

\Tina4\Get::add('/api/users', function(\Tina4\Response $response) {
    return $response(\Tina4\ORM::find("user")->asArray());
});

\Tina4\Get::add('/api/users/{id}', function($id, \Tina4\Response $response) {
    return $response((new User($id))->asArray());
});

\Tina4\Post::add('/api/auth/login', function(\Tina4\Response $response, \Tina4\Request $request) {
    // Authenticate and return JWT
    $token = \Tina4\Auth::generateToken(["username" => $request->data->username]);
    return $response(["user" => $user, "token" => $token]);
});
```

---

## Example 3: Reusable Components Library

```ts
// src/components/tina4-button.ts
import { Tina4Element, html } from 'tina4';

class Tina4Button extends Tina4Element {
  static props = { variant: String, size: String, disabled: Boolean };
  static styles = `
    :host { display: inline-block; }
    button {
      border: none; border-radius: 4px; cursor: pointer;
      font-family: inherit; transition: opacity 0.2s;
    }
    button:hover { opacity: 0.8; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .primary { background: #2563eb; color: white; }
    .secondary { background: #e5e7eb; color: #1f2937; }
    .danger { background: #dc2626; color: white; }
    .sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
    .md { padding: 0.5rem 1rem; font-size: 1rem; }
    .lg { padding: 0.75rem 1.5rem; font-size: 1.125rem; }
  `;

  render() {
    return html`
      <button
        class="${() => `${this.prop('variant').value || 'primary'} ${this.prop('size').value || 'md'}`}"
        ?disabled=${this.prop('disabled')}
        @click=${(e: Event) => this.emit('press', { detail: e })}>
        <slot></slot>
      </button>
    `;
  }
}
customElements.define('tina4-button', Tina4Button);

// src/components/tina4-modal.ts
import { Tina4Element, html, signal } from 'tina4';

class Tina4Modal extends Tina4Element {
  static props = { open: Boolean, title: String };
  static styles = `
    :host { position: fixed; inset: 0; z-index: 1000; }
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
             background: white; border-radius: 8px; padding: 1.5rem; min-width: 300px;
             box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    :host(:not([open])) { display: none; }
  `;

  render() {
    return html`
      <div class="backdrop" @click=${() => this.emit('close')}></div>
      <div class="modal">
        <div class="header">
          <h2>${this.prop('title')}</h2>
          <button class="close" @click=${() => this.emit('close')}>x</button>
        </div>
        <slot></slot>
      </div>
    `;
  }
}
customElements.define('tina4-modal', Tina4Modal);
```

**Usage:**
```ts
const showModal = signal(false);

html`
  <tina4-button variant="primary" @press=${() => showModal.value = true}>
    Open Modal
  </tina4-button>

  <tina4-modal
    ?open=${showModal}
    title="Confirm Action"
    @close=${() => showModal.value = false}>
    <p>Are you sure you want to proceed?</p>
    <tina4-button variant="danger" @press=${() => { doAction(); showModal.value = false; }}>
      Confirm
    </tina4-button>
    <tina4-button variant="secondary" @press=${() => showModal.value = false}>
      Cancel
    </tina4-button>
  </tina4-modal>
`;
```

---

## Example 4: Islands Mode (Progressive Enhancement in tina4-python)

**Server-rendered Twig template (tina4-python):**
```twig
{# src/templates/products.twig #}
{% extends "base.twig" %}

{% block content %}
  <h1>Products</h1>

  {# Static server-rendered content (SEO-friendly, no JS needed) #}
  {% for product in products %}
    <div class="product-card">
      <h2>{{ product.name }}</h2>
      <p>{{ product.description }}</p>
      <p class="price">${{ product.price }}</p>

      {# Interactive island — only this needs JS #}
      <add-to-cart
        product-id="{{ product.id }}"
        product-name="{{ product.name }}"
        price="{{ product.price }}">
      </add-to-cart>
    </div>
  {% endfor %}

  {# Cart widget — another interactive island #}
  <cart-summary></cart-summary>
{% endblock %}

{% block scripts %}
  <script type="module">
    import { signal, html, Tina4Element, api } from '/js/tina4.esm.js';

    // Shared state across islands
    const cart = signal([]);
    const cartTotal = computed(() =>
      cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
    );

    class AddToCart extends Tina4Element {
      static props = { productId: String, productName: String, price: Number };
      static shadow = false; // inherit page styles
      qty = signal(1);

      render() {
        return html`
          <div class="add-to-cart">
            <input type="number" min="1" max="99"
              .value=${this.qty}
              @input=${(e) => this.qty.value = +e.target.value}>
            <button @click=${() => {
              cart.value = [...cart.value, {
                id: this.prop('productId').value,
                name: this.prop('productName').value,
                price: +this.prop('price').value,
                qty: this.qty.value,
              }];
            }}>Add to Cart</button>
          </div>
        `;
      }
    }
    customElements.define('add-to-cart', AddToCart);

    class CartSummary extends Tina4Element {
      static shadow = false;

      render() {
        return html`
          <div class="cart-summary">
            <h3>Cart (${() => cart.value.length} items)</h3>
            <ul>
              ${() => cart.value.map(item => html`
                <li>${item.name} x${item.qty} — $${item.price * item.qty}</li>
              `)}
            </ul>
            <p class="total">Total: $${cartTotal}</p>
            <button @click=${async () => {
              await api.post('/api/orders', { items: cart.value });
              cart.value = [];
            }}>Checkout</button>
          </div>
        `;
      }
    }
    customElements.define('cart-summary', CartSummary);
  </script>
{% endblock %}
```

**tina4-python backend:**
```python
# src/routes/products.py
from tina4_python import get, post

@get("/products")
async def list_products(request, response):
    products = ORM.find("product").as_list()
    return response(render("products.twig", {"products": products}))

@post("/api/orders")
async def create_order(request, response):
    order = Order.create(items=request.body["items"])
    return response({"orderId": order.id, "status": "created"})
```

---

## Example 5: PWA — Offline-Capable Notes App

```ts
// src/main.ts
import { signal, computed, html, route, router, api, pwa } from 'tina4';

// PWA setup
pwa.register({
  name: 'Tina4 Notes',
  shortName: 'Notes',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first',
  precache: ['/', '/css/default.css'],
  offlineRoute: '/offline',
});

// State — persisted to localStorage
const notes = signal<{ id: string; title: string; body: string; updated: number }[]>(
  JSON.parse(localStorage.getItem('notes') ?? '[]')
);

// Auto-save to localStorage when notes change
effect(() => {
  localStorage.setItem('notes', JSON.stringify(notes.value));
});

// Sync to server when online
async function syncNotes() {
  if (!navigator.onLine) return;
  try {
    await api.post('/notes/sync', { notes: notes.value });
  } catch { /* offline, will sync later */ }
}

// Routes
route('/', () => html`
  <div class="notes-app">
    <h1>My Notes</h1>
    <button @click=${() => {
      const id = crypto.randomUUID();
      notes.value = [{ id, title: 'New Note', body: '', updated: Date.now() }, ...notes.value];
      navigate('/note/' + id);
    }}>New Note</button>

    <ul class="notes-list">
      ${() => notes.value.map(note => html`
        <li>
          <a href="/note/${note.id}">${note.title}</a>
          <small>${new Date(note.updated).toLocaleDateString()}</small>
        </li>
      `)}
    </ul>

    <tina4-install>
      <button class="install-btn">Install App</button>
    </tina4-install>
  </div>
`);

route('/note/{id}', ({ id }) => {
  const note = computed(() => notes.value.find(n => n.id === id));

  function update(field: string, value: string) {
    notes.value = notes.value.map(n =>
      n.id === id ? { ...n, [field]: value, updated: Date.now() } : n
    );
    syncNotes();
  }

  return html`
    <div class="note-editor">
      <a href="/">Back</a>
      <input type="text"
        value=${() => note.value?.title ?? ''}
        @input=${(e: Event) => update('title', (e.target as HTMLInputElement).value)}>
      <textarea
        @input=${(e: Event) => update('body', (e.target as HTMLTextAreaElement).value)}
      >${() => note.value?.body ?? ''}</textarea>
    </div>
  `;
});

route('/offline', () => html`
  <div class="offline">
    <h1>You're offline</h1>
    <p>Your notes are saved locally. They'll sync when you're back online.</p>
    <a href="/">View Notes</a>
  </div>
`);

// Sync when coming back online
window.addEventListener('online', syncNotes);

router.start({ target: '#root', mode: 'history' });
```

---

## Example 6: CDN Usage — No Build Tools

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tina4 Quick Start</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 2rem auto; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    import { signal, computed, html, route, router, api }
      from 'https://cdn.jsdelivr.net/npm/tina4js/dist/tina4.esm.js';

    // A complete app in one <script> tag
    const posts = signal([]);
    const loading = signal(true);

    route('/', async () => {
      loading.value = true;
      const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10');
      posts.value = await res.json();
      loading.value = false;

      return html`
        <h1>Posts</h1>
        ${() => loading.value
          ? html`<p>Loading...</p>`
          : html`<div>${posts.value.map(p => html`
              <div class="card">
                <h3><a href="/post/${p.id}">${p.title}</a></h3>
                <p>${p.body.slice(0, 100)}...</p>
              </div>
            `)}</div>`
        }
      `;
    });

    route('/post/{id}', async ({ id }) => {
      const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
      const post = await res.json();
      return html`
        <a href="/">Back</a>
        <h1>${post.title}</h1>
        <p>${post.body}</p>
      `;
    });

    router.start({ target: '#root', mode: 'hash' });
  </script>
</body>
</html>
```

---

## Example 7: Component Communication (Parent-Child)

```ts
// A search component that emits results to a parent

class SearchInput extends Tina4Element {
  static props = { placeholder: String, endpoint: String };
  query = signal('');
  results = signal([]);
  debounceTimer: any = null;

  async search(q: string) {
    if (q.length < 2) { this.results.value = []; return; }
    const data = await api.get(`${this.prop('endpoint').value}?q=${encodeURIComponent(q)}`);
    this.results.value = data;
    this.emit('results', { detail: data });
  }

  render() {
    return html`
      <div class="search">
        <input type="text"
          placeholder=${this.prop('placeholder')}
          @input=${(e: Event) => {
            this.query.value = (e.target as HTMLInputElement).value;
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.search(this.query.value), 300);
          }}>
        ${() => this.results.value.length > 0 ? html`
          <ul class="suggestions">
            ${this.results.value.map(r => html`
              <li @click=${() => {
                this.emit('select', { detail: r });
                this.results.value = [];
              }}>${r.name}</li>
            `)}
          </ul>
        ` : null}
      </div>
    `;
  }

  onUnmount() { clearTimeout(this.debounceTimer); }
}
customElements.define('search-input', SearchInput);

// Parent usage:
html`
  <search-input
    endpoint="/api/users/search"
    placeholder="Search users..."
    @select=${(e: CustomEvent) => {
      selectedUser.value = e.detail;
    }}>
  </search-input>

  ${() => selectedUser.value
    ? html`<p>Selected: ${selectedUser.value.name}</p>`
    : null
  }
`;
```
