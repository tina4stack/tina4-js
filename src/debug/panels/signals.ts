/**
 * Signals Panel — Live signal inspector.
 */

import { signalTracker } from '../trackers';

function formatValue(val: unknown): { text: string; cls: string } {
  if (val === null || val === undefined) return { text: String(val), cls: 'val-null' };
  if (typeof val === 'string') return { text: `"${val.length > 30 ? val.slice(0, 30) + '...' : val}"`, cls: 'val-string' };
  if (typeof val === 'number') return { text: String(val), cls: 'val-number' };
  if (typeof val === 'boolean') return { text: String(val), cls: 'val-boolean' };
  if (Array.isArray(val)) return { text: `Array(${val.length})`, cls: 'val-object' };
  if (typeof val === 'object') {
    try { return { text: JSON.stringify(val).slice(0, 40), cls: 'val-object' }; } catch { /* fall through */ }
  }
  return { text: String(val), cls: 'val-object' };
}

export function renderSignalsPanel(): string {
  const signals = signalTracker.getAll();

  if (signals.length === 0) {
    return `<div class="t4-empty">No signals tracked yet.<br>Signals created after debug is enabled will appear here.</div>`;
  }

  let rows = '';
  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    const { text, cls } = formatValue(s.value);
    rows += `<tr>
      <td>${s.label || `signal_${i}`}</td>
      <td><span class="${cls}">${escHtml(text)}</span></td>
      <td>${s.subscriberCount}</td>
      <td>${s.updateCount}</td>
    </tr>`;
  }

  return `<table>
    <thead><tr><th>Label</th><th>Value</th><th>Subs</th><th>Updates</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
