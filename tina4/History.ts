// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

export class History {

    static addHistory(path, target, method) {
        let historyInfo = JSON.parse(localStorage.getItem('history'));
        let pathInfo = {path: null};
        if (historyInfo.length > 0) {
            pathInfo = historyInfo[historyInfo.length - 1];
        }
        if (method === 'GET' && pathInfo.path !== path || method === 'POST') {
            historyInfo.push({path: path, target: target});
            localStorage.setItem('history', JSON.stringify(historyInfo));
        }
    }

    static resolveHistory() {
        let historyInfo = JSON.parse(localStorage.getItem('history'));
        historyInfo.pop();
        let pathInfo = {path: "/", target: null};
        if (historyInfo.length > 0) {
            pathInfo = historyInfo[historyInfo.length - 1];
            localStorage.setItem('history', JSON.stringify(historyInfo));
        }
        return pathInfo;
    }

}