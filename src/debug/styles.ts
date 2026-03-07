/**
 * Debug Overlay Styles — Scoped inside Shadow DOM.
 */

export const debugStyles = /* css */ `
:host {
  all: initial;
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 999999;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  color: #e0e0e0;
  line-height: 1.4;
}

* { box-sizing: border-box; }

.t4-debug {
  width: 480px;
  max-height: 420px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 8px 0 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: -4px -4px 20px rgba(0,0,0,0.5);
}

.t4-debug.collapsed {
  max-height: none;
}

.t4-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #16213e;
  border-bottom: 1px solid #333;
  border-radius: 8px 0 0 0;
  cursor: move;
  user-select: none;
}

.t4-logo {
  font-weight: 700;
  font-size: 13px;
  color: #00d4ff;
  letter-spacing: 0.5px;
}

.t4-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #0f3460;
  color: #00d4ff;
  margin-left: 8px;
}

.t4-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.t4-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
}
.t4-close:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }

.t4-tabs {
  display: flex;
  border-bottom: 1px solid #333;
  background: #16213e;
}

.t4-tab {
  flex: 1;
  padding: 6px 8px;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.t4-tab:hover { color: #ccc; background: rgba(255,255,255,0.03); }
.t4-tab.active {
  color: #00d4ff;
  border-bottom-color: #00d4ff;
  background: rgba(0,212,255,0.05);
}

.t4-tab-count {
  font-size: 10px;
  color: #666;
  margin-left: 4px;
}

.t4-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 200px;
  max-height: 340px;
}

.t4-body::-webkit-scrollbar { width: 6px; }
.t4-body::-webkit-scrollbar-track { background: transparent; }
.t4-body::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

/* Panel table styles */
table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 4px 8px;
  color: #888;
  font-weight: 500;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2a2a3e;
  position: sticky;
  top: 0;
  background: #1a1a2e;
}

td {
  padding: 3px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

tr:hover td { background: rgba(255,255,255,0.02); }

/* Value displays */
.val-string { color: #a8e6cf; }
.val-number { color: #ffd3a5; }
.val-boolean { color: #ff8b94; }
.val-object { color: #b8b5ff; }
.val-null { color: #666; font-style: italic; }

/* Status badges */
.status-ok { color: #66bb6a; }
.status-err { color: #ff6b6b; }
.status-pending { color: #ffa726; }

/* Route pattern */
.route-pattern { color: #b8b5ff; }
.route-param { color: #ffd3a5; }

/* Duration */
.duration { color: #888; font-size: 11px; }
.duration.fast { color: #66bb6a; }
.duration.slow { color: #ffa726; }
.duration.very-slow { color: #ff6b6b; }

/* Empty state */
.t4-empty {
  text-align: center;
  color: #555;
  padding: 32px 16px;
  font-size: 12px;
}

/* Collapsed mini-badge */
.t4-mini {
  position: fixed;
  bottom: 12px;
  right: 12px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  color: #00d4ff;
  box-shadow: -2px -2px 10px rgba(0,0,0,0.3);
  z-index: 999999;
  display: flex;
  align-items: center;
  gap: 6px;
}
.t4-mini:hover { background: #16213e; }

.t4-mini-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #66bb6a;
}
`;
