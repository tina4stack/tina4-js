// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * tina4js/storage — Persistent signals.
 *
 * Read STORAGE.md before using this module. localStorage is XSS-readable;
 * never put credentials, tokens, personal data, or secrets here.
 */

export { persist, clearPersistedKeys } from './persist';
export type { PersistOptions, PersistSerializer, PersistedSignal } from './persist';
