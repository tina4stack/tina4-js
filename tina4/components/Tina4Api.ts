// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import {Globals} from "../Globals";

export class Tina4Api extends HTMLElement {
    constructor() {
        // Always call super first in constructor
        super();
        let api = {};
        api['url'] = this.getAttribute('url');
        api['token'] = this.getAttribute('token');
        Globals.set('api', api);
    }
}
