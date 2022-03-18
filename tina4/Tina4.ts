import {Router} from "./Router";
import Handlebars = require("handlebars");

export class Tina4{
    constructor(config=null) {
        Tina4.setup(config);
    }

    static setup(config=null){

        if (window['tina4'] === undefined) {
            console.log('Initialize Tina4');
            window['tina4'] = {};
            window['tina4']['routes'] = [];
        }

        if (config !== null) {
            window['tina4']['config'] = config;
            window['tina4']['handleBars'] = Handlebars;
        }

        //load the templates in
    }

    init (path, target, method:string='GET', data=null) {
        return new Router(path, target, method, data).run();
    }

    static renderTemplate(content, params) {
        let template = Handlebars.compile(content);
        return template(params);
    }
}