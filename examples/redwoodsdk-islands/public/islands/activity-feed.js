/**
 * <activity-feed> — tina4-js island for RedwoodSDK
 *
 * Displays a live activity feed that polls for updates.
 * Demonstrates tina4-js computed signals for filtering.
 *
 * Usage in RSC:
 *   <activity-feed max="10" />
 *
 * Size: ~0.6KB (uses tina4-js core from CDN)
 */

import { signal, computed, effect, html, Tina4Element } from 'https://unpkg.com/tina4js@1/dist/core.es.js';

class ActivityFeed extends Tina4Element {
  static props = { max: Number };
  static shadow = true;

  static styles = `
    :host { display: block; background: #1a2733; border: 1px solid #2a3a4a; border-radius: 8px; padding: 1.2rem; }
    h3 { font-size: 1rem; margin-bottom: 1rem; color: #e0e8f0; }
    .item { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #2a3a4a; font-size: 0.9rem; }
    .item:last-child { border-bottom: none; }
    .action { color: #e0e8f0; }
    .time { color: #8899aa; font-size: 0.8rem; }
    .badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600; margin-right: 0.4rem; }
    .badge.create { background: rgba(102,187,106,0.15); color: #66bb6a; }
    .badge.update { background: rgba(79,195,247,0.15); color: #4fc3f7; }
    .badge.delete { background: rgba(239,83,80,0.15); color: #ef5350; }
    .badge.login { background: rgba(255,167,38,0.15); color: #ffa726; }
    .empty { color: #8899aa; font-style: italic; }
  `;

  items = signal([]);

  connectedCallback() {
    super.connectedCallback();
    this._poll();
    this._interval = setInterval(() => this._poll(), 5000);
  }

  disconnectedCallback() {
    if (this._interval) clearInterval(this._interval);
  }

  async _poll() {
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      const max = this.prop('max') || 5;
      this.items.value = data.slice(0, max);
    } catch (e) {
      // Silently fail — demo may not have API backend
      if (this.items.value.length === 0) {
        this.items.value = [
          { action: 'login', user_name: 'Alice', detail: 'Dashboard access', created_at: 'just now' },
          { action: 'create', user_name: 'Bob', detail: 'Added new report', created_at: '2m ago' },
          { action: 'update', user_name: 'Carol', detail: 'Updated settings', created_at: '5m ago' },
          { action: 'delete', user_name: 'Dan', detail: 'Removed old export', created_at: '8m ago' },
        ];
      }
    }
  }

  render() {
    return html`
      <h3>Activity Feed</h3>
      ${() => this.items.value.length === 0
        ? html`<div class="empty">No activity yet</div>`
        : this.items.value.map(item => html`
            <div class="item">
              <span class="action">
                <span class="badge ${item.action}">${item.action}</span>
                ${item.user_name || 'System'} — ${item.detail || ''}
              </span>
              <span class="time">${item.created_at}</span>
            </div>
          `)
      }
    `;
  }
}

customElements.define('activity-feed', ActivityFeed);
