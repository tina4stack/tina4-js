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