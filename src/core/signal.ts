/**
 * Tina4 Signals — Reactive state primitives.
 *
 * signal(value)       — create a reactive value
 * computed(fn)        — derive a value that auto-tracks dependencies
 * effect(fn)          — run a side-effect that auto-tracks dependencies
 * batch(fn)           — batch multiple signal updates into one notification
 */

/** The currently executing effect (used for auto-tracking). */
let currentEffect: (() => void) | null = null;

/** Cleanup functions for the currently executing effect's signal subscriptions. */
let currentCleanups: (() => void)[] | null = null;

/** @internal When set, effect() pushes its dispose function here. */
let _effectCollector: (() => void)[] | null = null;

/** @internal Start collecting effect disposers (used by router). */
export function _setEffectCollector(collector: (() => void)[] | null): void {
  _effectCollector = collector;
}

/** @internal Read the current effect collector (used by html renderer). */
export function _getEffectCollector(): (() => void)[] | null {
  return _effectCollector;
}

// ── Debug Hooks (tree-shakeable — null unless debug module imported) ──

/** @internal Called when a signal is created. */
export let __debugSignalCreate: ((s: Signal<unknown>, label?: string) => void) | null = null;
/** @internal Called when a signal value changes. */
export let __debugSignalUpdate: ((s: Signal<unknown>, oldVal: unknown, newVal: unknown) => void) | null = null;
/** @internal Set the debug hooks. */
export function __setDebugSignalHooks(
  onCreate: typeof __debugSignalCreate,
  onUpdate: typeof __debugSignalUpdate,
) {
  __debugSignalCreate = onCreate;
  __debugSignalUpdate = onUpdate;
}

/** Batch depth counter — notifications deferred while > 0. */
let batchDepth = 0;

/** Queued subscriber functions to run when outermost batch completes. */
const batchQueue = new Set<() => void>();

// ── Signal ──────────────────────────────────────────────────────────

export interface Signal<T> {
  value: T;
  /** @internal */
  readonly _t4: true;
  /** @internal subscribe directly (used by html renderer) */
  _subscribe(fn: () => void): () => void;
  /** @internal read without tracking */
  peek(): T;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  /** @internal */
  readonly _t4: true;
  /** @internal */
  _subscribe(fn: () => void): () => void;
  peek(): T;
}

/**
 * Create a reactive signal — a value that notifies subscribers when it changes.
 *
 * @param initial - The initial value.
 * @param label   - Optional debug label shown in the debug overlay.
 * @returns A signal whose `.value` getter/setter is reactive.
 *
 * @example
 * const count = signal(0);
 * count.value;      // read: 0
 * count.value = 5;  // write: triggers all subscribers
 *
 * const name = signal('Alice', 'userName'); // labelled for debug overlay
 */
export function signal<T>(initial: T, label?: string): Signal<T> {
  let value = initial;
  const subs = new Set<() => void>();

  const s: Signal<T> & { _debugInfo?: { label?: string; createdAt: number; updateCount: number; subs: Set<() => void> } } = {
    _t4: true as const,

    get value(): T {
      if (currentEffect) {
        subs.add(currentEffect);
        if (currentCleanups) {
          const eff = currentEffect;
          currentCleanups.push(() => subs.delete(eff));
        }
      }
      return value;
    },

    set value(next: T) {
      if (Object.is(next, value)) return;
      const old = value;
      value = next;
      if (s._debugInfo) s._debugInfo.updateCount++;
      if (__debugSignalUpdate) __debugSignalUpdate(s as Signal<unknown>, old, next);
      if (batchDepth > 0) {
        for (const sub of subs) batchQueue.add(sub);
      } else {
        let firstError: unknown;
        for (const sub of [...subs]) {
          try { sub(); } catch (e) { if (firstError === undefined) firstError = e; }
        }
        if (firstError !== undefined) throw firstError;
      }
    },

    _subscribe(fn: () => void) {
      subs.add(fn);
      return () => { subs.delete(fn); };
    },

    peek(): T {
      return value;
    },
  };

  // Attach debug info if debug module is active
  if (__debugSignalCreate) {
    s._debugInfo = { label, createdAt: Date.now(), updateCount: 0, subs };
    __debugSignalCreate(s as Signal<unknown>, label);
  }

  return s;
}

// ── Computed ─────────────────────────────────────────────────────────

/**
 * Create a derived signal that auto-tracks its dependencies.
 * Re-computes whenever any signal read inside `fn` changes.
 * The result is read-only — writing throws.
 *
 * @param fn - Pure function that reads signals and returns a derived value.
 * @returns A read-only signal.
 *
 * @example
 * const price = signal(10);
 * const qty   = signal(3);
 * const total = computed(() => price.value * qty.value);
 * total.value; // 30 — updates automatically when price or qty change
 */
export function computed<T>(fn: () => T): ReadonlySignal<T> {
  const inner = signal<T>(undefined as T);

  // Run the compute function inside an effect so it auto-tracks
  effect(() => {
    inner.value = fn();
  });

  return {
    _t4: true as const,

    get value(): T {
      return inner.value;
    },

    set value(_: T) {
      throw new Error('[tina4] computed signals are read-only');
    },

    _subscribe(fn: () => void) {
      return inner._subscribe(fn);
    },

    peek(): T {
      return inner.peek();
    },
  } as ReadonlySignal<T>;
}

// ── Effect ──────────────────────────────────────────────────────────

/**
 * Run a side-effect that auto-tracks signal dependencies.
 * Runs immediately, then re-runs whenever a dependency changes.
 * If the effect throws, sibling effects still run; the first error is re-thrown
 * after all subscribers have been notified.
 *
 * @param fn - The side-effect function. Reads signals to establish tracking.
 * @returns A `dispose` function — call it to stop the effect.
 *
 * @example
 * const count = signal(0);
 * const stop = effect(() => {
 *   console.log('count is', count.value);
 * });
 * // logs immediately, then on every count change
 * stop(); // unsubscribe
 */
export function effect(fn: () => void): () => void {
  let disposed = false;
  let cleanups: (() => void)[] = [];

  const execute = () => {
    if (disposed) return;
    // Remove previous signal subscriptions before re-running
    for (const c of cleanups) c();
    cleanups = [];

    const prev = currentEffect;
    const prevCleanups = currentCleanups;
    currentEffect = execute;
    currentCleanups = cleanups;
    try {
      fn();
    } finally {
      currentEffect = prev;
      currentCleanups = prevCleanups;
    }
  };

  execute();

  const dispose = () => {
    disposed = true;
    // Remove from all signals' subscriber sets
    for (const c of cleanups) c();
    cleanups = [];
  };
  if (_effectCollector) _effectCollector.push(dispose);
  return dispose;
}

// ── Batch ───────────────────────────────────────────────────────────

/**
 * Batch multiple signal updates into a single notification pass.
 * Subscribers are notified once after `fn` completes, not after each write.
 *
 * @param fn - Function containing one or more signal writes.
 *
 * @example
 * const a = signal(1);
 * const b = signal(2);
 * batch(() => {
 *   a.value = 10;
 *   b.value = 20;
 * }); // effects run once, not twice
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const queued = [...batchQueue];
      batchQueue.clear();
      let firstError: unknown;
      for (const s of queued) {
        try { s(); } catch (e) { if (firstError === undefined) firstError = e; }
      }
      if (firstError !== undefined) throw firstError;
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Check if a value is a tina4 signal. */
export function isSignal(value: unknown): value is Signal<unknown> {
  return value !== null && typeof value === 'object' && (value as any)._t4 === true;
}
