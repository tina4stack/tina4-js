/**
 * Debug Trackers — Data collection for signals, components, routes, and API.
 */

import type { Signal } from '../core/signal';
import type { Tina4Element } from '../core/component';
import type { ChangeEvent } from '../router/router';

// ── Signal Tracker ──────────────────────────────────────────────────

export interface TrackedSignal {
  ref: WeakRef<Signal<unknown>>;
  label?: string;
  createdAt: number;
  updateCount: number;
  subs: WeakRef<Set<() => void>>;
}

const trackedSignals: TrackedSignal[] = [];

export const signalTracker = {
  add(s: Signal<unknown>, label?: string) {
    const info = (s as any)._debugInfo;
    trackedSignals.push({
      ref: new WeakRef(s),
      label,
      createdAt: info?.createdAt ?? Date.now(),
      updateCount: 0,
      subs: new WeakRef(info?.subs ?? new Set()),
    });
  },

  onUpdate(s: Signal<unknown>) {
    for (const t of trackedSignals) {
      if (t.ref.deref() === s) {
        t.updateCount++;
        break;
      }
    }
  },

  getAll(): { label?: string; value: unknown; subscriberCount: number; updateCount: number; alive: boolean }[] {
    const results: ReturnType<typeof signalTracker.getAll> = [];
    for (let i = trackedSignals.length - 1; i >= 0; i--) {
      const t = trackedSignals[i];
      const sig = t.ref.deref();
      if (!sig) {
        trackedSignals.splice(i, 1);
        continue;
      }
      const subs = t.subs.deref();
      results.push({
        label: t.label,
        value: sig.peek(),
        subscriberCount: subs ? subs.size : 0,
        updateCount: (sig as any)._debugInfo?.updateCount ?? t.updateCount,
        alive: true,
      });
    }
    return results;
  },

  get count() { return trackedSignals.length; },
};

// ── Component Tracker ───────────────────────────────────────────────

export interface TrackedComponent {
  ref: WeakRef<Tina4Element>;
  tagName: string;
  mountedAt: number;
}

const mountedComponents: TrackedComponent[] = [];

export const componentTracker = {
  onMount(el: Tina4Element) {
    mountedComponents.push({
      ref: new WeakRef(el),
      tagName: el.tagName.toLowerCase(),
      mountedAt: Date.now(),
    });
  },

  onUnmount(el: Tina4Element) {
    const idx = mountedComponents.findIndex(c => c.ref.deref() === el);
    if (idx >= 0) mountedComponents.splice(idx, 1);
  },

  getAll(): { tagName: string; props: Record<string, unknown>; alive: boolean }[] {
    const results: ReturnType<typeof componentTracker.getAll> = [];
    for (let i = mountedComponents.length - 1; i >= 0; i--) {
      const c = mountedComponents[i];
      const el = c.ref.deref();
      if (!el || !el.isConnected) {
        mountedComponents.splice(i, 1);
        continue;
      }
      // Read prop values from attributes
      const props: Record<string, unknown> = {};
      const ctor = el.constructor as any;
      if (ctor.props) {
        for (const name of Object.keys(ctor.props)) {
          try { props[name] = el.prop(name).peek(); } catch { /* skip */ }
        }
      }
      results.push({ tagName: c.tagName, props, alive: true });
    }
    return results;
  },

  get count() { return mountedComponents.length; },
};

// ── Route Tracker ───────────────────────────────────────────────────

export interface RouteEntry {
  path: string;
  pattern: string;
  params: Record<string, string>;
  durationMs: number;
  timestamp: number;
}

const routeHistory: RouteEntry[] = [];
const MAX_ROUTE_HISTORY = 50;
let _getRoutesFn: (() => ReadonlyArray<{ pattern: string; hasGuard: boolean }>) | null = null;

export const routeTracker = {
  /** Set the function that reads registered routes (avoids direct import from router). */
  setGetRoutes(fn: typeof _getRoutesFn) { _getRoutesFn = fn; },

  getRegisteredRoutes(): ReadonlyArray<{ pattern: string; hasGuard: boolean }> {
    return _getRoutesFn ? _getRoutesFn() : [];
  },
  onNavigate(event: ChangeEvent) {
    routeHistory.unshift({
      path: event.path,
      pattern: event.pattern,
      params: event.params,
      durationMs: event.durationMs,
      timestamp: Date.now(),
    });
    if (routeHistory.length > MAX_ROUTE_HISTORY) routeHistory.pop();
  },

  getHistory(): readonly RouteEntry[] {
    return routeHistory;
  },

  get count() { return routeHistory.length; },
};

// ── API Tracker ─────────────────────────────────────────────────────

export interface ApiEntry {
  id: number;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  hasAuth: boolean;
  timestamp: number;
  pending: boolean;
  error?: string;
}

let apiId = 0;
const apiLog: ApiEntry[] = [];
const pendingRequests = new Map<string, ApiEntry>();
const MAX_API_LOG = 100;

export const apiTracker = {
  onRequest(config: RequestInit & { headers: Record<string, string> }): void {
    const id = ++apiId;
    const entry: ApiEntry = {
      id,
      method: config.method ?? 'GET',
      url: '', // will be set from URL context
      hasAuth: !!config.headers?.['Authorization'],
      timestamp: Date.now(),
      pending: true,
    };
    // Use a stringified id as key for the pending map
    const key = String(id);
    pendingRequests.set(key, entry);
    apiLog.unshift(entry);
    if (apiLog.length > MAX_API_LOG) apiLog.pop();
  },

  onResponse(response: { status: number; ok: boolean }): void {
    // Match with latest pending request
    for (const [key, entry] of pendingRequests) {
      if (entry.pending) {
        entry.status = response.status;
        entry.durationMs = Date.now() - entry.timestamp;
        entry.pending = false;
        if (!response.ok) entry.error = `HTTP ${response.status}`;
        pendingRequests.delete(key);
        break;
      }
    }
  },

  getLog(): readonly ApiEntry[] {
    return apiLog;
  },

  get count() { return apiLog.length; },
};
