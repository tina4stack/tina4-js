// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Debug overlay first — so it tracks every signal, including module-level
// store signals created during the imports below (Ctrl+Shift+D to toggle).
import 'tina4js/debug';
import { signal, computed, html, route, router, navigate, api } from 'tina4js';
import '@/routes/index';

// Configure API (uncomment to connect to tina4-php/python backend)
// api.configure({ baseUrl: '/api', auth: true });

// Start router
router.start({ target: '#root', mode: 'history' });
