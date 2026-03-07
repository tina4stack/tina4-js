/**
 * API Panel — Request/response log.
 */

import { apiTracker } from '../trackers';

function formatDuration(ms?: number): { text: string; cls: string } {
  if (ms === undefined) return { text: '...', cls: 'status-pending' };
  const text = ms < 1 ? '<1ms' : `${Math.round(ms)}ms`;
  const cls = ms < 100 ? 'duration fast' : ms < 500 ? 'duration' : ms < 2000 ? 'duration slow' : 'duration very-slow';
  return { text, cls };
}

function formatStatus(status?: number, pending?: boolean): { text: string; cls: string } {
  if (pending) return { text: 'pending', cls: 'status-pending' };
  if (!status) return { text: '—', cls: '' };
  if (status >= 200 && status < 300) return { text: String(status), cls: 'status-ok' };
  return { text: String(status), cls: 'status-err' };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function renderApiPanel(): string {
  const log = apiTracker.getLog();

  if (log.length === 0) {
    return `<div class="t4-empty">No API calls yet.<br>Requests made via api.get/post/put/patch/delete will appear here.</div>`;
  }

  let rows = '';
  for (const entry of log) {
    const { text: statusText, cls: statusCls } = formatStatus(entry.status, entry.pending);
    const { text: durText, cls: durCls } = formatDuration(entry.durationMs);
    rows += `<tr>
      <td>${formatTime(entry.timestamp)}</td>
      <td><strong>${entry.method}</strong></td>
      <td>${escHtml(entry.url || '(url)')}</td>
      <td><span class="${statusCls}">${statusText}</span></td>
      <td><span class="${durCls}">${durText}</span></td>
      <td>${entry.hasAuth ? 'Bearer' : '—'}</td>
    </tr>`;
  }

  return `<table>
    <thead><tr><th>Time</th><th>Method</th><th>URL</th><th>Status</th><th>Duration</th><th>Auth</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
