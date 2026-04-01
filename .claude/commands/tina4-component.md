# Create a tina4-js Web Component

Create a new Tina4Element web component. Follow these rules exactly.

## Instructions

1. Create the component file for `$ARGUMENTS` (or ask the user for the component name)
2. Extend `Tina4Element`
3. Use signals for all reactive state
4. Define static `props` for attributes
5. Return `html` tagged template from `render()`

## Template

```javascript
import { Tina4Element, signal, html } from "tina4-js";

class MyComponent extends Tina4Element {
    count = signal(0);

    static props = {
        label: { type: String, default: "Default" },
    };

    render() {
        return html`
            <div>
                <h2>${this.prop("label")}</h2>
                <button @click=${() => this.count.value++}>
                    Clicked: ${this.count}
                </button>
            </div>
        `;
    }
}

customElements.define("my-component", MyComponent);
```

## Key Rules

- Component names MUST have a hyphen (Web Components spec): `my-widget`, `user-card`
- Use `this.prop("name")` to access props reactively — NOT `this.getAttribute()`
- Use `${signal}` for reactive text — NOT `${signal.value}` (evaluates once, never updates)
- Use `${() => expr}` for reactive conditionals and lists
- Use `?disabled=${signal}` for boolean attributes
- Use `.value=${signal}` for DOM property binding
- Use `@click=${fn}` for event listeners — NOT `onclick`
- Call `this.cleanup(() => ...)` for teardown logic
