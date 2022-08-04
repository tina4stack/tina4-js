export class Tina4Config extends HTMLElement {
    constructor() {
        // Always call super first in constructor
        super();

        // write element functionality in here
        console.log ('Here!', this.getAttribute('name'));
    }
}
