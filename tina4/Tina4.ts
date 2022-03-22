import {Router} from "./Router";
import Twig from 'twig';
export class Tina4{
    constructor(config=null) {
        if (config === undefined || config === null) {
            if (window['tina4'] !== undefined && window['tina4']['config'] !== undefined) {
                config = window['tina4']['config'];
            } else {
                config = {defaultTarget: 'root'};
            }
        }
        console.log ('Config found', config);
        Tina4.resolveRoutes(window.location.pathname, config.defaultTarget);
    }

    static initialize(config=null){
        if (window['tina4'] === undefined) {
            console.log('Initialize Tina4');
            window['tina4'] = {};
            window['tina4']['routes'] = [];
            window['tina4']['twig'] = Twig;
        }

        if (config !== null) {
            window['tina4']['config'] = config;
        } else {
            window['tina4']['config'] = {defaultTarget: 'root'};
        }

        //load the templates in

        //add the navigate handler
        // @ts-ignore
        window.navigate = function(path, target='root', method:string='GET', data = null) {
            console.log (window['tina4']);
            if (window['tina4']['config'].defaultTarget !== null) {
                target = window['tina4']['config'].defaultTarget;
            }
            history.pushState({}, '', path);
            Tina4.resolveRoutes(path, target, method, data);
        };
    }

    static resolveRoutes (path, target, method:string='GET', data=null) {
        return new Router(path, target, method, data).run();
    }

    static renderTemplate(content, params) {
        console.log ('Rendering Twig', content, params);
        let template = Twig.twig({data: content});
        return template.render(params);
    }
}