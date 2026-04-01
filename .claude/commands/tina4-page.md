# Create a tina4-js Page

Create a new SPA page with routing for `$ARGUMENTS` (or ask the user for the page name).

## Instructions

1. Create a route handler function
2. Register it with the router
3. Use signals for page state
4. Fetch data from the API if needed

## Template

```javascript
import { signal, html, route, api } from "tina4-js";

// Page state
const items = signal([]);
const loading = signal(true);
const error = signal(null);

// Route handler
route("/items", async () => {
    loading.value = true;
    try {
        const result = await api.get("/items");
        items.value = result.data;
        error.value = null;
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }

    return html`
        <div class="container mt-4">
            <h1>Items</h1>

            ${() => loading.value
                ? html`<p>Loading...</p>`
                : null}

            ${() => error.value
                ? html`<div class="alert alert-danger">${error}</div>`
                : null}

            ${() => !loading.value && !error.value
                ? html`
                    <ul>
                        ${() => items.value.map(item => html`
                            <li>${item.name}</li>
                        `)}
                    </ul>
                `
                : null}
        </div>
    `;
});

// Route with parameters
route("/items/{id}", async ({ id }) => {
    const item = await api.get(`/items/${id}`);
    return html`<h1>${item.data.name}</h1>`;
});
```

## Key Rules

- Route pattern is ALWAYS the first argument: `route("/path", handler)`
- Use `{id}` for path parameters (NOT `:id`)
- Route handlers can be async — return html template
- Use `navigate("/path")` to navigate programmatically
- Keep page state in signals outside the route handler for persistence
- Use `api.get/post/put/delete` for backend calls
