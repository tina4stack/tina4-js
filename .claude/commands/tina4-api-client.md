# Set Up tina4-js API Client

Configure the API client for `$ARGUMENTS` (or ask the user for the API base URL).

## Instructions

1. Configure the API client with base URL and auth
2. Create typed API functions for each endpoint
3. Handle errors and loading states

## Template

```javascript
import { signal, html, api } from "tina4-js";

// Configure once at startup
api.configure({
    baseUrl: "/api",
    auth: true,                    // Sends Authorization header
    formToken: true,               // Sends form_token for CSRF
    onError: (error) => {
        console.error("API Error:", error);
    },
});

// API functions
async function fetchUsers(page = 1) {
    return api.get("/users", { params: { page, limit: 20 } });
}

async function createUser(data) {
    return api.post("/users", data);
}

async function updateUser(id, data) {
    return api.put(`/users/${id}`, data);
}

async function deleteUser(id) {
    return api.delete(`/users/${id}`);
}

// Usage with signals
const users = signal([]);
const loading = signal(false);

async function loadUsers() {
    loading.value = true;
    const result = await fetchUsers();
    users.value = result.data;
    loading.value = false;
}
```

## Key Rules

- `api` is a singleton — configure once, use everywhere
- `api.configure(config)` — NOT `new Api(config)`
- Methods: `api.get(path, options?)`, `api.post(path, body?, options?)`
- Options: `{ params, headers }` — params become query string
- Response: `{ data, status, headers }`
- Auth token is sent automatically when `auth: true`
- Form token is injected automatically when `formToken: true`
