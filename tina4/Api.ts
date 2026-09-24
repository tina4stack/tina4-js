// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import {Globals} from "./Globals";
export class Api {

    static sendRequest (endPoint, request, method, callback) {
        if (endPoint === undefined) {
            endPoint = "";
        }

        if (request === undefined) {
            request = null;
        }

        if (method === undefined) {
            method = 'GET';
        }

        let api = Globals.get('api');
        if (api !== null) {
            endPoint = api.url + endPoint;
        }

        const xhr = new XMLHttpRequest();
        xhr.open(method, endPoint, true);

        xhr.onload = function () {
            let content = xhr.response;
            try {
                content = JSON.parse(content);
                callback(content);
            } catch (exception) {
                callback (content);
            }
        };

        if (method === 'POST') {
            xhr.send(request);
        } else {
            xhr.send(null);
        }
    }

}