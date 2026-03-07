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

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subs = new Set<() => void>();

  return {
    _t4: true as const,

    get value(): T {
      if (currentEffect) subs.add(currentEffect);
      return value;
    },

    set value(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      if (batchDepth > 0) {
        for (const s of subs) batchQueue.add(s);
      } else {
        // Copy to avoid issues if a subscriber modifies the set
        for (const s of [...subs]) s();
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
