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

export function signal<T>(initial: T, label?: string): Signal<T> {
  let value = initial;
  const subs = new Set<() => void>();

  const s: Signal<T> & { _debugInfo?: { label?: string; createdAt: number; updateCount: number; subs: Set<() => void> } } = {
    _t4: true as const,

    get value(): T {
      if (currentEffect) subs.add(currentEffect);
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
        for (const sub of [...subs]) sub();
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

export function effect(fn: () => void): () => void {
  let disposed = false;

  const execute = () => {
    if (disposed) return;
    const prev = currentEffect;
    currentEffect = execute;
    try {
      fn();
    } finally {
      currentEffect = prev;
    }
  };

  execute();

  return () => {
    disposed = true;
  };
}

// ── Batch ───────────────────────────────────────────────────────────

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const queued = [...batchQueue];
      batchQueue.clear();
      for (const s of queued) s();
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Check if a value is a tina4 signal. */
export function isSignal(value: unknown): value is Signal<unknown> {
  return value !== null && typeof value === 'object' && (value as any)._t4 === true;
}
