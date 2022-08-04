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