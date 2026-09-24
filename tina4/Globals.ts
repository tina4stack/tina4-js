// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

export class Globals {

    static initialize () {
        window['tina4'] = {};
    }

    static defined() {
        return (window['tina4'] !== undefined);
    }

    static set(name, value) {
        if (!this.defined()) {
            this.initialize();
        }
        window['tina4'][name] = value;
    }

    static append (name, value) {
        if (window['tina4'][name] === undefined) {
            window['tina4'][name] = [];
        }
        window['tina4'][name].push(value);
    }

    static get (name) {
        if (this.defined() && window['tina4'][name]) {
            return window['tina4'][name];
        } else {
            return null;
        }
    }
}