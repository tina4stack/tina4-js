# Create tina4-js Reactive State

Set up reactive state with signals for `$ARGUMENTS` (or ask the user for the feature).

## Instructions

1. Create signals for the reactive state
2. Use computed for derived values
3. Use effect for side effects
4. Use batch for multiple updates

## Template

```javascript
import { signal, computed, effect, batch } from "tina4-js";

// Reactive state
const items = signal([]);
const filter = signal("");
const loading = signal(false);

// Derived
const filtered = computed(() =>
    items.value.filter(item =>
        item.name.toLowerCase().includes(filter.value.toLowerCase())
    )
);
const count = computed(() => filtered.value.length);

// Side effect
effect(() => {
    console.log(`${count.value} items match "${filter.value}"`);
});

// Batch multiple changes (triggers effects once)
batch(() => {
    items.value = [...items.value, { name: "New" }];
    filter.value = "";
});
```

## Key Rules

- Access values with `.value` — `count.value` to read, `count.value = 5` to set
- NEVER use function-call syntax — `count()` does NOT exist
- In `html` templates: pass signal itself `${count}` for reactive binding
- `${count.value}` in templates evaluates ONCE and freezes — this is almost always a bug
- `computed` re-evaluates automatically when dependencies change
- `effect` runs immediately once, then on every dependency change
- `batch` groups updates — effects fire once after the batch
- Signal labels are optional: `signal(0, "counter")` for debug overlay
