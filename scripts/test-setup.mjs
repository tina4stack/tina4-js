// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// The happy-dom environment for node:test, registrator-style: copy the DOM and
// web APIs off a happy-dom window onto the Node global, so `document`,
// `HTMLElement`, `customElements`, `Event`, etc. exist before any test module
// (Tina4Element extends HTMLElement at import time). Used via
// `node --import ./scripts/test-setup.mjs`. happy-dom is the only DOM here - no
// jsdom, no Vitest environment.
import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow({ url: "http://localhost/" });

// Keep Node's own infrastructure and timers (node:test's mock.timers patches the
// Node timers; happy-dom's would shadow them and break fake-timer tests).
const KEEP_NODE = new Set([
  "global", "globalThis", "process", "require", "module", "exports",
  "__dirname", "__filename", "Buffer", "queueMicrotask",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "setImmediate", "clearImmediate",
]);

for (const key of Object.getOwnPropertyNames(window)) {
  if (KEEP_NODE.has(key)) continue;
  try {
    const desc = Object.getOwnPropertyDescriptor(window, key);
    if (desc && (desc.get || desc.set)) {
      Object.defineProperty(globalThis, key, desc);
    } else {
      globalThis[key] = window[key];
    }
  } catch { /* some window props are read-only; skip */ }
}

globalThis.window = window;
globalThis.document = window.document;

// localStorage/sessionStorage as a plain object (NOT happy-dom's Proxy-based
// Storage). happy-dom's Storage traps property writes as item writes, so
// `spyOn(localStorage, 'setItem')` would be swallowed as an item named
// "setItem" instead of shadowing the method - the exact reason the old
// tests/setup.ts polyfilled it. A plain object has own, writable, configurable
// methods that a spy can replace.
function plainStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index) => [...store.keys()][index] ?? null,
  };
}
// defineProperty, not assignment: the copy loop above may have installed these
// as getter-only properties off the happy-dom window.
Object.defineProperty(globalThis, "localStorage", { value: plainStorage(), writable: true, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: plainStorage(), writable: true, configurable: true });
