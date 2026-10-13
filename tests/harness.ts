// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * Zero-dependency vitest-compatible test surface over node:test + node:assert.
 *
 * tina4-js is zero-dependency by design; its test toolchain should not drag in
 * Vite/Vitest (and the postcss/nanoid/rollup tree under them). This harness
 * provides the describe/it/expect/vi surface the suite already uses, so the 23
 * test files change only their import line. Timers ride node:test's native
 * mock.timers; spies are a small own closure that records calls in the vitest
 * shape (`fn.mock.calls` is an array of argument arrays).
 */
import assert from "node:assert/strict";
import { describe, it, test, before, after, beforeEach, afterEach, mock } from "node:test";

export { describe, it, test, beforeEach, afterEach };
// vitest spells the suite-level hooks beforeAll/afterAll.
export const beforeAll = before;
export const afterAll = after;

const fmt = (v: unknown): string => {
  try { return typeof v === "string" ? JSON.stringify(v) : String(v); } catch { return "<unprintable>"; }
};

// vitest asymmetric matchers (expect.any / objectContaining / stringContaining /
// arrayContaining / stringMatching) carry a predicate `equals` honours in place
// of a value.
class AsymmetricMatcher {
  constructor(public asymmetricMatch: (actual: any) => boolean) {}
}
const isMatcher = (v: unknown): v is AsymmetricMatcher => v instanceof AsymmetricMatcher;

// Matcher-aware deep equality — used by toEqual / toHaveBeenCalledWith / contain.
function deepEqual(a: any, b: any): boolean {
  if (isMatcher(b)) return b.asymmetricMatch(a);
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) { if (a.length !== b.length) return false; return a.every((x: any, i: number) => deepEqual(x, b[i])); }
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return bk.every((k) => deepEqual(a[k], b[k]));
}

// Subset match: every key in `expected` is present and (deep) equal in `actual`.
function matchObject(actual: any, expected: any): boolean {
  if (isMatcher(expected)) return expected.asymmetricMatch(actual);
  if (expected === null || typeof expected !== "object") return deepEqual(actual, expected);
  if (actual === null || typeof actual !== "object") return false;
  for (const k of Object.keys(expected)) {
    const e = expected[k];
    if (e !== null && typeof e === "object" && !Array.isArray(e) && !isMatcher(e)) {
      if (!matchObject(actual[k], e)) return false;
    } else if (!deepEqual(actual[k], e)) return false;
  }
  return true;
}

function callsOf(spy: any): unknown[][] {
  if (spy && spy.mock && Array.isArray(spy.mock.calls)) {
    // Own viFn: calls are already arg arrays. node:test mock: calls are {arguments}.
    return spy.mock.calls.map((c: any) => (Array.isArray(c) ? c : c.arguments));
  }
  throw new assert.AssertionError({ message: "expected a mock/spy function" });
}

class Expectation {
  constructor(private actual: any, private negated = false) {}
  private pass(cond: boolean, message: string): void {
    if (this.negated ? cond : !cond) throw new assert.AssertionError({ message });
  }
  get not(): Expectation { return new Expectation(this.actual, !this.negated); }

  toBe(expected: unknown) { this.pass(Object.is(this.actual, expected), `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} be ${fmt(expected)}`); }
  toEqual(expected: unknown) { this.pass(deepEqual(this.actual, expected), `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} equal ${fmt(expected)}`); }
  toStrictEqual(expected: unknown) { this.toEqual(expected); }
  toContain(item: unknown) {
    const ok = typeof this.actual === "string" ? this.actual.includes(item as string)
      : Array.isArray(this.actual) ? this.actual.includes(item)
      : false;
    this.pass(ok, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} contain ${fmt(item)}`);
  }
  toContainEqual(item: unknown) { this.pass(Array.isArray(this.actual) && this.actual.some((x) => deepEqual(x, item)), `expected to contain equal ${fmt(item)}`); }
  toBeNull() { this.pass(this.actual === null, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} be null`); }
  toBeUndefined() { this.pass(this.actual === undefined, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} be undefined`); }
  toBeDefined() { this.pass(this.actual !== undefined, `expected value to${this.negated ? " not" : ""} be defined`); }
  toBeTruthy() { this.pass(!!this.actual, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} be truthy`); }
  toBeFalsy() { this.pass(!this.actual, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} be falsy`); }
  toBeNaN() { this.pass(Number.isNaN(this.actual), `expected ${fmt(this.actual)} to be NaN`); }
  toHaveLength(n: number) { this.pass(this.actual != null && this.actual.length === n, `expected length ${this.actual?.length} to${this.negated ? " not" : ""} be ${n}`); }
  toMatch(re: RegExp | string) {
    const ok = typeof this.actual === "string" && (re instanceof RegExp ? re.test(this.actual) : this.actual.includes(re));
    this.pass(ok, `expected ${fmt(this.actual)} to${this.negated ? " not" : ""} match ${re}`);
  }
  toMatchObject(expected: object) { this.pass(matchObject(this.actual, expected), `expected ${fmt(this.actual)} to match object ${fmt(expected)}`); }
  toHaveProperty(path: string, value?: unknown) {
    const parts = path.split(".");
    let cur: any = this.actual;
    for (const p of parts) { if (cur == null || !(p in Object(cur))) { this.pass(false, `expected property ${path}`); return; } cur = cur[p]; }
    this.pass(arguments.length < 2 ? true : deepEqual(cur, value), `expected property ${path} to equal ${fmt(value)}`);
  }
  toBeInstanceOf(ctor: any) { this.pass(this.actual instanceof ctor, `expected ${fmt(this.actual)} to be instance of ${ctor?.name}`); }
  toBeGreaterThan(n: number) { this.pass(this.actual > n, `expected ${this.actual} > ${n}`); }
  toBeGreaterThanOrEqual(n: number) { this.pass(this.actual >= n, `expected ${this.actual} >= ${n}`); }
  toBeLessThan(n: number) { this.pass(this.actual < n, `expected ${this.actual} < ${n}`); }
  toBeLessThanOrEqual(n: number) { this.pass(this.actual <= n, `expected ${this.actual} <= ${n}`); }
  toBeCloseTo(n: number, digits = 2) { this.pass(Math.abs(this.actual - n) < Math.pow(10, -digits) / 2, `expected ${this.actual} close to ${n}`); }
  toThrow(expected?: RegExp | string | RegExp) {
    let threw = false, err: any;
    try { if (typeof this.actual === "function") this.actual(); } catch (e) { threw = true; err = e; }
    let ok = threw;
    if (threw && expected !== undefined) {
      const msg = err && err.message ? String(err.message) : String(err);
      ok = expected instanceof RegExp ? expected.test(msg) : msg.includes(String(expected));
    }
    this.pass(ok, `expected function to${this.negated ? " not" : ""} throw${expected ? ` matching ${expected}` : ""}`);
  }
  toThrowError(expected?: RegExp | string) { this.toThrow(expected as any); }

  // spy matchers
  toHaveBeenCalled() { this.pass(callsOf(this.actual).length > 0, `expected spy to${this.negated ? " not" : ""} have been called`); }
  toHaveBeenCalledTimes(n: number) { const c = callsOf(this.actual).length; this.pass(c === n, `expected spy called ${c} time(s) to${this.negated ? " not" : ""} be ${n}`); }
  toHaveBeenCalledWith(...args: unknown[]) { this.pass(callsOf(this.actual).some((c) => deepEqual(c, args)), `expected spy to${this.negated ? " not" : ""} have been called with ${fmt(args)}`); }
  toHaveBeenLastCalledWith(...args: unknown[]) { const c = callsOf(this.actual); this.pass(c.length > 0 && deepEqual(c[c.length - 1], args), `expected spy last called with ${fmt(args)}`); }
  toHaveBeenNthCalledWith(n: number, ...args: unknown[]) { const c = callsOf(this.actual); this.pass(c.length >= n && deepEqual(c[n - 1], args), `expected spy call #${n} with ${fmt(args)}`); }

  // async modifiers
  get resolves() { return new AsyncExpectation(this.actual, this.negated, false); }
  get rejects() { return new AsyncExpectation(this.actual, this.negated, true); }
}

class AsyncExpectation {
  constructor(private actual: any, private negated: boolean, private wantReject: boolean) {}
  private async settle(): Promise<{ value?: any; error?: any; rejected: boolean }> {
    try { return { value: await this.actual, rejected: false }; } catch (error) { return { error, rejected: true }; }
  }
  private make(value: any): Expectation { return new Expectation(value, this.negated); }
  async toBe(e: unknown) { const r = await this.guard(); this.make(r).toBe(e); }
  async toEqual(e: unknown) { const r = await this.guard(); this.make(r).toEqual(e); }
  async toThrow(e?: RegExp | string) {
    const s = await this.settle();
    if (!s.rejected) throw new assert.AssertionError({ message: "expected promise to reject" });
    const msg = s.error && s.error.message ? String(s.error.message) : String(s.error);
    if (e !== undefined) { const ok = e instanceof RegExp ? e.test(msg) : msg.includes(String(e)); if (!ok) throw new assert.AssertionError({ message: `expected rejection matching ${e}, got ${msg}` }); }
  }
  // `.rejects.toThrow()` / `.resolves.toBe()` cover the suite; guard resolves the value.
  private async guard(): Promise<any> {
    const s = await this.settle();
    if (this.wantReject && !s.rejected) throw new assert.AssertionError({ message: "expected promise to reject" });
    if (!this.wantReject && s.rejected) throw new assert.AssertionError({ message: `expected promise to resolve, it rejected with ${s.error}` });
    return this.wantReject ? s.error : s.value;
  }
}

export function expect(actual: unknown): Expectation { return new Expectation(actual); }

// Asymmetric matchers, honoured by deepEqual/matchObject above.
expect.any = (ctor: any): any => new AsymmetricMatcher((a) => {
  if (ctor === String) return typeof a === "string" || a instanceof String;
  if (ctor === Number) return typeof a === "number" || a instanceof Number;
  if (ctor === Boolean) return typeof a === "boolean";
  if (ctor === Function) return typeof a === "function";
  if (ctor === Object) return a !== null && typeof a === "object";
  if (ctor === Array) return Array.isArray(a);
  return a != null && a instanceof ctor;
});
expect.objectContaining = (obj: object): any => new AsymmetricMatcher((a) => matchObject(a, obj));
expect.arrayContaining = (arr: unknown[]): any => new AsymmetricMatcher((a) => Array.isArray(a) && arr.every((e) => a.some((x) => deepEqual(x, e))));
expect.stringContaining = (s: string): any => new AsymmetricMatcher((a) => typeof a === "string" && a.includes(s));
expect.stringMatching = (re: RegExp | string): any => new AsymmetricMatcher((a) => typeof a === "string" && (re instanceof RegExp ? re.test(a) : a.includes(re)));
expect.anything = (): any => new AsymmetricMatcher((a) => a !== null && a !== undefined);

// ── vi: spies + mocks (own, vitest-shaped) + native timers ──────────────────
type ViFn = ((...a: any[]) => any) & {
  mock: { calls: any[][]; results: any[] };
  mockReturnValue: (v: any) => ViFn;
  mockReturnValueOnce: (v: any) => ViFn;
  mockResolvedValue: (v: any) => ViFn;
  mockResolvedValueOnce: (v: any) => ViFn;
  mockRejectedValue: (v: any) => ViFn;
  mockRejectedValueOnce: (v: any) => ViFn;
  mockImplementation: (fn: (...a: any[]) => any) => ViFn;
  mockImplementationOnce: (fn: (...a: any[]) => any) => ViFn;
  mockReset: () => void;
  mockClear: () => void;
  mockRestore: () => void;
};

function viFn(impl?: (...a: any[]) => any): ViFn {
  let implementation = impl;
  const onceImpls: Array<(...a: any[]) => any> = [];
  const calls: any[][] = [];
  const results: any[] = [];
  const f = ((...args: any[]) => {
    calls.push(args);
    const active = onceImpls.length ? onceImpls.shift()! : implementation;
    const r = active ? active(...args) : undefined;
    results.push(r);
    return r;
  }) as ViFn;
  f.mock = { calls, results };
  f.mockReturnValue = (v) => { implementation = () => v; return f; };
  f.mockReturnValueOnce = (v) => { onceImpls.push(() => v); return f; };
  f.mockResolvedValue = (v) => { implementation = () => Promise.resolve(v); return f; };
  f.mockResolvedValueOnce = (v) => { onceImpls.push(() => Promise.resolve(v)); return f; };
  f.mockRejectedValue = (v) => { implementation = () => Promise.reject(v); return f; };
  f.mockRejectedValueOnce = (v) => { onceImpls.push(() => Promise.reject(v)); return f; };
  f.mockImplementation = (fn) => { implementation = fn; return f; };
  f.mockImplementationOnce = (fn) => { onceImpls.push(fn); return f; };
  f.mockReset = () => { calls.length = 0; results.length = 0; onceImpls.length = 0; implementation = impl; };
  f.mockClear = () => { calls.length = 0; results.length = 0; };
  f.mockRestore = () => { calls.length = 0; results.length = 0; };
  return f;
}

export const vi = {
  fn: (impl?: (...a: any[]) => any) => viFn(impl),
  spyOn(obj: any, method: string): ViFn {
    const original = obj[method];
    const desc = Object.getOwnPropertyDescriptor(obj, method);
    const spy = viFn(typeof original === "function" ? original.bind(obj) : undefined);
    spy.mockRestore = () => {
      if (desc) Object.defineProperty(obj, method, desc);
      else { try { delete obj[method]; } catch { obj[method] = original; } }
    };
    Object.defineProperty(obj, method, { value: spy, writable: true, configurable: true, enumerable: true });
    return spy;
  },
  useFakeTimers() { mock.timers.enable({ apis: ["setTimeout", "setInterval", "setImmediate", "Date"] }); return vi; },
  useRealTimers() { mock.timers.reset(); return vi; },
  advanceTimersByTime(ms: number) { mock.timers.tick(ms); return vi; },
  async advanceTimersByTimeAsync(ms: number) { mock.timers.tick(ms); await Promise.resolve(); return vi; },
  clearAllMocks() { /* per-spy clear is used in the suite */ },
  restoreAllMocks() { /* per-spy restore is used in the suite */ },
};
