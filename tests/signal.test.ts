import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, batch, isSignal } from '../src/core/signal';

describe('signal', () => {
  it('holds an initial value', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it('updates value', () => {
    const s = signal('hello');
    s.value = 'world';
    expect(s.value).toBe('world');
  });

  it('does not notify if value unchanged (Object.is)', () => {
    const s = signal(1);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);
    s.value = 1; // same value
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('treats new object reference as changed', () => {
    const obj = { a: 1 };
    const s = signal(obj);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });
    s.value = obj; // same reference → no change
    expect(fn).toHaveBeenCalledTimes(1);
    s.value = { a: 1 }; // new reference → change
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('works with null and undefined', () => {
    const s = signal<string | null>(null);
    expect(s.value).toBeNull();
    s.value = 'hello';
    expect(s.value).toBe('hello');
    s.value = null;
    expect(s.value).toBeNull();
  });

  it('handles boolean values', () => {
    const s = signal(false);
    expect(s.value).toBe(false);
    s.value = true;
    expect(s.value).toBe(true);
  });

  it('peek() reads without tracking', () => {
    const s = signal(10);
    const fn = vi.fn();
    effect(() => {
      s.peek(); // should NOT subscribe
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    s.value = 20;
    expect(fn).toHaveBeenCalledTimes(1); // no re-run
  });

  it('isSignal() detects signals', () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(42)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal({ _t4: false })).toBe(false);
  });
});

describe('computed', () => {
  it('derives from a signal', () => {
    const a = signal(2);
    const b = computed(() => a.value * 3);
    expect(b.value).toBe(6);
  });

  it('updates when dependency changes', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);
    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('chains multiple computed values', () => {
    const base = signal(2);
    const doubled = computed(() => base.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    expect(quadrupled.value).toBe(8);
    base.value = 5;
    expect(quadrupled.value).toBe(20);
  });

  it('is read-only', () => {
    const c = computed(() => 42);
    expect(() => { (c as any).value = 99; }).toThrow();
  });

  it('handles conditional dependencies', () => {
    const toggle = signal(true);
    const a = signal('A');
    const b = signal('B');
    const result = computed(() => toggle.value ? a.value : b.value);
    expect(result.value).toBe('A');
    toggle.value = false;
    expect(result.value).toBe('B');
  });

  it('computes from other computed values', () => {
    const x = signal(3);
    const y = computed(() => x.value + 1);
    const z = computed(() => y.value * 2);
    expect(z.value).toBe(8);
    x.value = 10;
    expect(z.value).toBe(22);
  });
});

describe('effect', () => {
  it('runs immediately', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-runs when signal changes', () => {
    const s = signal(0);
    const values: number[] = [];
    effect(() => { values.push(s.value); });
    expect(values).toEqual([0]);
    s.value = 1;
    expect(values).toEqual([0, 1]);
    s.value = 2;
    expect(values).toEqual([0, 1, 2]);
  });

  it('tracks multiple signals', () => {
    const a = signal('hello');
    const b = signal('world');
    const results: string[] = [];
    effect(() => { results.push(`${a.value} ${b.value}`); });
    expect(results).toEqual(['hello world']);
    a.value = 'hi';
    expect(results).toEqual(['hello world', 'hi world']);
    b.value = 'there';
    expect(results).toEqual(['hello world', 'hi world', 'hi there']);
  });

  it('disposes cleanly', () => {
    const s = signal(0);
    const fn = vi.fn();
    const dispose = effect(() => { s.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);
    dispose();
    s.value = 1;
    expect(fn).toHaveBeenCalledTimes(1); // no more calls
  });

  it('works with computed inside effects', () => {
    const base = signal(5);
    const doubled = computed(() => base.value * 2);
    const results: number[] = [];
    effect(() => { results.push(doubled.value); });
    expect(results).toEqual([10]);
    base.value = 7;
    expect(results).toEqual([10, 14]);
  });
});

describe('batch', () => {
  it('defers notifications until batch completes', () => {
    const a = signal(0);
    const b = signal(0);
    const fn = vi.fn();
    effect(() => { a.value + b.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      a.value = 1;
      b.value = 2;
    });
    // Only one additional call, not two
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('nested batches wait for outermost', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });

    batch(() => {
      batch(() => {
        s.value = 1;
        s.value = 2;
      });
      // Still inside outer batch, so no notification yet
      s.value = 3;
    });
    // One notification after outermost batch
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.value).toBe(3);
  });

  it('works correctly if batch throws', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });

    try {
      batch(() => {
        s.value = 1;
        throw new Error('oops');
      });
    } catch { /* expected */ }

    // Batch should still flush despite error
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.value).toBe(1);
  });
});
