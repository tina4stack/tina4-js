/**
 * <live-stats> — tina4-js island for RedwoodSDK
 *
 * A self-contained Web Component that polls an API endpoint
 * and displays live KPI cards with reactive signals.
 *
 * Usage in RSC:
 *   <live-stats endpoint="/api/stats" refresh="5000" columns="4" />
 *
 * Attributes:
 *   endpoint — URL to fetch stats JSON from
 *   refresh  — polling interval in ms (default: 3000)
 *   columns  — grid columns (default: "3")
 *
 * Size: ~0.8KB (uses tina4-js core from CDN)
 */

import { signal, computed, effect, html, Tina4Element } from 'https://unpkg.com/tina4js@1/dist/core.es.js';

class LiveStats extends Tina4Element {
  static props = {
    endpoint: String,
    refresh: Number,
    columns: String,
  };

  static shadow = true;

  static styles = `
    :host { display: block; }
    .grid { display: grid; gap: 1rem; }
    .card {
      background: #1a2733; border: 1px solid #2a3a4a; border-radius: 8px;
      padding: 1.2rem; transition: border-color 0.3s;
    }
    .card:hover { border-color: #4fc3f7; }
    .label { font-size: 0.8rem; color: #8899aa; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 2rem; font-weight: 700; margin-top: 0.3rem; color: #4fc3f7; }
    .change { font-size: 0.85rem; margin-top: 0.2rem; }
    .change.up { color: #66bb6a; }
    .change.down { color: #ef5350; }
    .loading { color: #8899aa; font-style: italic; }
  `;

  stats = signal([]);
  loading = signal(true);
  _interval = null;

  connectedCallback() {
    super.connectedCallback();
    this._fetch();
    const interval = this.prop('refresh') || 3000;
    this._interval = setInterval(() => this._fetch(), interval);
  }

  disconnectedCallback() {
    if (this._interval) clearInterval(this._interval);
  }

  async _fetch() {
    try {
      const endpoint = this.prop('endpoint') || '/api/stats';
      const res = await fetch(endpoint);
      const data = await res.json();

      // Accept either array or object format
      if (Array.isArray(data)) {
        this.stats.value = data;
      } else {
        // Convert object to array of { label, value, change }
        this.stats.value = Object.entries(data).map(([key, val]) => ({
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
          value: typeof val === 'number' ? val.toLocaleString() : val,
          change: null,
        }));
      }
      this.loading.value = false;
    } catch (e) {
      console.error('[live-stats] fetch error:', e);
    }
  }

  render() {
    const cols = this.prop('columns') || '3';

    return html`
      <div class="grid" style="grid-template-columns: repeat(${cols}, 1fr);">
        ${() => this.loading.value
          ? html`<div class="loading">Loading stats...</div>`
          : this.stats.value.map(s => html`
              <div class="card">
                <div class="label">${s.label}</div>
                <div class="value">${s.value}</div>
                ${s.change != null ? html`
                  <div class="change ${s.change >= 0 ? 'up' : 'down'}">
                    ${s.change >= 0 ? '+' : ''}${s.change}%
                  </div>
                ` : html``}
              </div>
            `)
        }
      </div>
    `;
  }
}

customElements.define('live-stats', LiveStats);
