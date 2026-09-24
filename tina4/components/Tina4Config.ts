// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

export class Tina4Config extends HTMLElement {
    constructor() {
        // Always call super first in constructor
        super();

        // write element functionality in here
        console.log ('Here!', this.getAttribute('name'));
    }
}
