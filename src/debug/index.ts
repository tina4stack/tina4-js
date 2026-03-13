/**
 * tina4js/debug — Developer debug overlay.
 *
 * Import this module to enable the debug overlay:
 *   import 'tina4js/debug';
 *
 * Or conditionally:
 *   if (import.meta.env.DEV) import('tina4js/debug');
 *
 * Toggle: Ctrl+Shift+D
 */

import { __setDebugSignalHooks } from '../core/signal';
import { __setDebugComponentHooks } from '../core/component';
import { router, _getRoutes } from '../router/router';
import { api } from '../api/fetch';
import { signalTracker, componentTracker, routeTracker, apiTracker } from './trackers';
import { Tina4Debug, registerDebugElement } from './overlay';

let debugEl: Tina4Debug | null = null;
let enabled = false;

/**
 * Enable the debug overlay. Called automatically on import,
 * or can be called explicitly.
 */
export function enableDebug(): void {
  if (enabled) return;
  enabled = true;

  // ── Wire signal hooks ──────────────────────────────────────────────
  __setDebugSignalHooks(
    (s, label) => signalTracker.add(s, label),
    (s) => signalTracker.onUpdate(s),
  );

  // ── Wire component hooks ───────────────────────────────────────────
  __setDebugComponentHooks(
    (el) => componentTracker.onMount(el),
    (el) => componentTracker.onUnmount(el),
  );

  // ── Wire route tracking ────────────────────────────────────────────
  routeTracker.setGetRoutes(_getRoutes);
  router.on('change', (event) => {
    routeTracker.onNavigate(event);
  });

  // ── Wire API tracking ──────────────────────────────────────────────
  api.intercept('request', (config) => {
    apiTracker.onRequest(config);
    return config;
  });

  api.intercept('response', (response) => {
    apiTracker.onResponse(response);
    return response;
  });

  // ── Mount overlay ──────────────────────────────────────────────────
  if (typeof document !== 'undefined') {
    registerDebugElement();
    debugEl = document.createElement('tina4-debug') as Tina4Debug;
    document.body.appendChild(debugEl);

    // Keyboard shortcut: Ctrl+Shift+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        debugEl?.toggle();
      }
    });
  }

  console.log(
    '%c[tina4] %cDebug overlay enabled %c(Ctrl+Shift+D to toggle)',
    'color:#00d4ff;font-weight:bold',
    'color:#e0e0e0',
    'color:#888',
  );
}

// Auto-enable on import
enableDebug();
