/**
 * Debug Overlay — Shadow DOM custom element with tabbed panel UI.
 */

import { debugStyles } from './styles';
import { signalTracker, componentTracker, routeTracker, apiTracker } from './trackers';
import { renderSignalsPanel } from './panels/signals';
import { renderComponentsPanel } from './panels/components';
import { renderRoutesPanel } from './panels/routes';
import { renderApiPanel } from './panels/api';

type TabId = 'signals' | 'components' | 'routes' | 'api';

export class Tina4Debug extends HTMLElement {
  private _shadow: ShadowRoot;
  private _visible = true;
  private _activeTab: TabId = 'signals';
  private _refreshTimer: number | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._render();
    this._startAutoRefresh();
  }

  disconnectedCallback() {
    this._stopAutoRefresh();
  }

  toggle() {
    this._visible = !this._visible;
    this._render();
  }

  show() {
    this._visible = true;
    this._render();
  }

  hide() {
    this._visible = false;
    this._render();
  }

  private _startAutoRefresh() {
    this._refreshTimer = window.setInterval(() => {
      if (this._visible) this._renderBody();
    }, 1000);
  }

  private _stopAutoRefresh() {
    if (this._refreshTimer !== null) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  private _switchTab(tab: TabId) {
    this._activeTab = tab;
    this._render();
  }

  private _getTabContent(): string {
    switch (this._activeTab) {
      case 'signals': return renderSignalsPanel();
      case 'components': return renderComponentsPanel();
      case 'routes': return renderRoutesPanel();
      case 'api': return renderApiPanel();
    }
  }

  private _renderBody() {
    const body = this._shadow.querySelector('.t4-body');
    if (body) body.innerHTML = this._getTabContent();
    // Update tab counts
    this._updateTabCounts();
  }

  private _updateTabCounts() {
    const counts: Record<TabId, number> = {
      signals: signalTracker.count,
      components: componentTracker.count,
      routes: routeTracker.count,
      api: apiTracker.count,
    };
    for (const [tab, count] of Object.entries(counts)) {
      const el = this._shadow.querySelector(`[data-tab-count="${tab}"]`);
      if (el) el.textContent = count > 0 ? `(${count})` : '';
    }
  }

  private _render() {
    const tabs: { id: TabId; label: string }[] = [
      { id: 'signals', label: 'Signals' },
      { id: 'components', label: 'Components' },
      { id: 'routes', label: 'Routes' },
      { id: 'api', label: 'API' },
    ];

    if (!this._visible) {
      this._shadow.innerHTML = `
        <style>${debugStyles}</style>
        <div class="t4-mini" id="t4-mini">
          <span class="t4-mini-dot"></span>
          Debug
        </div>
      `;
      this._shadow.getElementById('t4-mini')?.addEventListener('click', () => this.show());
      return;
    }

    const tabsHtml = tabs.map(t =>
      `<button class="t4-tab${this._activeTab === t.id ? ' active' : ''}" data-tab="${t.id}">
        ${t.label}<span class="t4-tab-count" data-tab-count="${t.id}"></span>
      </button>`
    ).join('');

    this._shadow.innerHTML = `
      <style>${debugStyles}</style>
      <div class="t4-debug">
        <div class="t4-header">
          <div>
            <span class="t4-logo">Tina4js</span>
            <span class="t4-badge">Debug</span>
          </div>
          <div class="t4-header-right">
            <button class="t4-close" id="t4-close" title="Close (Ctrl+Shift+D)">×</button>
          </div>
        </div>
        <div class="t4-tabs">${tabsHtml}</div>
        <div class="t4-body">${this._getTabContent()}</div>
      </div>
    `;

    // Bind events
    this._shadow.getElementById('t4-close')?.addEventListener('click', () => this.hide());

    for (const btn of this._shadow.querySelectorAll('.t4-tab')) {
      btn.addEventListener('click', () => {
        this._switchTab((btn as HTMLElement).dataset.tab as TabId);
      });
    }

    this._updateTabCounts();
  }
}

/** Register the custom element. Call before creating instances. */
export function registerDebugElement(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('tina4-debug')) {
    customElements.define('tina4-debug', Tina4Debug);
  }
}
