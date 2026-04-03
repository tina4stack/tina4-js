import { signal, computed, html } from 'tina4js';

export function homePage() {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  return html`
    <div class="page">
      <h1>Welcome to ${document.title}</h1>
      <p>Edit <code>src/pages/home.ts</code> to get started.</p>

      <div class="counter">
        <button @click=${() => count.value--}>-</button>
        <span>${count}</span>
        <button @click=${() => count.value++}>+</button>
      </div>
      <p class="muted">Doubled: ${doubled}</p>

      <nav>
        <a href="/about">About</a>
      </nav>
    </div>
  `;
}
