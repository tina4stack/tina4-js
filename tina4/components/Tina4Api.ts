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
