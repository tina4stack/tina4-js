// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * tina4js/core — Reactive primitives, HTML renderer, and web component base.
 */

export { signal, computed, effect, batch, isSignal } from './signal';
export type { Signal, ReadonlySignal } from './signal';
export { html } from './html';
export { Tina4Element } from './component';
export type { PropType } from './component';
