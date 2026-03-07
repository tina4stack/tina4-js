/**
 * Routes Panel — Registered routes and navigation history.
 */

import { _getRoutes } from '../../router/router';
import { routeTracker } from '../trackers';

function formatDuration(ms: number): { text: string; cls: string } {
  const text = ms < 1 ? '<1ms' : `${Math.round(ms)}ms`;
  const cls = ms < 5 ? 'duration fast' : ms < 50 ? 'duration' : ms < 200 ? 'duration slow' : 'duration very-slow';
  return { text, cls };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function renderRoutesPanel(): string {
  const registeredRoutes = _getRoutes();
  const history = routeTracker.getHistory();

  let html = '';

  // Registered routes
  if (registeredRoutes.length > 0) {
    let routeRows = '';
    for (const r of registeredRoutes) {
      routeRows += `<tr>
        <td><span class="route-pattern">${escHtml(r.pattern)}</span></td>
        <td>${r.hasGuard ? 'Yes' : '—'}</td>
      </tr>`;
    }
    html += `<table>
      <thead><tr><th>Pattern</th><th>Guard</th></tr></thead>
      <tbody>${routeRows}</tbody>
    </table>`;
  }

  // Navigation history
  if (history.length > 0) {
    html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #333;">`;
    let historyRows = '';
    for (const h of history) {
      const { text, cls } = formatDuration(h.durationMs);
      const params = Object.keys(h.params).length > 0
        ? Object.entries(h.params).map(([k, v]) => `<span class="route-param">${k}=${v}</span>`).join(' ')
        : '';
      historyRows += `<tr>
        <td>${formatTime(h.timestamp)}</td>
        <td>${escHtml(h.path)}</td>
        <td>${params || '—'}</td>
        <td><span class="${cls}">${text}</span></td>
      </tr>`;
    }
    html += `<table>
      <thead><tr><th>Time</th><th>Path</th><th>Params</th><th>Duration</th></tr></thead>
      <tbody>${historyRows}</tbody>
    </table></div>`;
  } else if (registeredRoutes.length === 0) {
    html = `<div class="t4-empty">No routes registered yet.</div>`;
  }

  return html;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
