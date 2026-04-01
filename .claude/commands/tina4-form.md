# Create a tina4-js Form

Create a reactive form for `$ARGUMENTS` (or ask the user for the form purpose).

## Instructions

1. Create signals for each form field
2. Use two-way binding with `.value=${signal}` and `@input`
3. Handle submission with the API client
4. Show validation and loading states

## Template

```javascript
import { signal, computed, html, api } from "tina4-js";

// Form state
const name = signal("");
const email = signal("");
const submitting = signal(false);
const error = signal(null);
const success = signal(false);

// Validation
const isValid = computed(() =>
    name.value.trim().length > 0 &&
    email.value.includes("@")
);

// Submit handler
async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid.value) return;

    submitting.value = true;
    error.value = null;

    try {
        await api.post("/users", {
            name: name.value,
            email: email.value,
        });
        success.value = true;
        name.value = "";
        email.value = "";
    } catch (e) {
        error.value = e.message;
    } finally {
        submitting.value = false;
    }
}

// Form UI
const form = html`
    <form @submit=${handleSubmit}>
        ${() => error.value
            ? html`<div class="alert alert-danger">${error}</div>`
            : null}

        ${() => success.value
            ? html`<div class="alert alert-success">Created!</div>`
            : null}

        <div class="form-group">
            <label>Name</label>
            <input
                type="text"
                .value=${name}
                @input=${(e) => { name.value = e.target.value; }}
                class="form-control"
            >
        </div>

        <div class="form-group">
            <label>Email</label>
            <input
                type="email"
                .value=${email}
                @input=${(e) => { email.value = e.target.value; }}
                class="form-control"
            >
        </div>

        <button
            type="submit"
            ?disabled=${() => !isValid.value || submitting.value}
            class="btn btn-primary"
        >
            ${() => submitting.value ? "Saving..." : "Submit"}
        </button>
    </form>
`;
```

## Key Rules

- Use `.value=${signal}` to bind input value reactively
- Use `@input=${(e) => { signal.value = e.target.value; }}` for two-way binding
- Use `?disabled=${() => expr}` for boolean attributes — function wrapper for reactive
- Use `${() => condition ? html\`...\` : null}` for conditional rendering
- Prevent default on form submit: `@submit=${handler}` with `e.preventDefault()`
- NEVER use `${signal.value}` in templates — pass signal itself for reactivity
