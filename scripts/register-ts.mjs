// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Registers the esbuild TS loader for the test run. Used via
// `node --import ./scripts/register-ts.mjs`.
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);
