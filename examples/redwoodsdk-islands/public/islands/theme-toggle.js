/**
 * <theme-toggle> — tina4-js island (smallest possible example)
 *
 * A single-purpose island that toggles dark/light theme.
 * Shows how tiny an island can be — just a signal and a click handler.
 *
 * Size: ~0.3KB
 */

import { signal, effect, html, Tina4Element } from 'https://unpkg.com/tina4js@1/dist/core.es.js';

class ThemeToggle extends Tina4Element {
  static shadow = true;
  static styles = `
    :host { display: inline-block; }
    button {
      background: none; border: 1px solid #2a3a4a; color: #8899aa;
      padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
    }
    button:hover { border-color: #4fc3f7; color: #4fc3f7; }
  `;

  dark = signal(true);

  connectedCallback() {
    super.connectedCallback();
    effect(() => {
      document.documentElement.style.setProperty('--bg', this.dark.value ? '#0f1923' : '#f0f2f5');
      document.documentElement.style.setProperty('--text', this.dark.value ? '#e0e8f0' : '#1a1a2e');
      document.documentElement.style.setProperty('--surface', this.dark.value ? '#1a2733' : '#ffffff');
      document.documentElement.style.setProperty('--border', this.dark.value ? '#2a3a4a' : '#dde0e4');
      document.documentElement.style.setProperty('--muted', this.dark.value ? '#8899aa' : '#6b7280');
    });
  }

  render() {
    return html`
      <button @click=${() => { this.dark.value = !this.dark.value; }}>
        ${() => this.dark.value ? 'Light' : 'Dark'}
      </button>
    `;
  }
}

customElements.define('theme-toggle', ThemeToggle);
