import {Globals} from "./Globals"
import {Router} from "./Router";
import {History} from "./History";
import Twig from 'twig';
import {Tina4Config} from "./components/Tina4Config";
import {Tina4Api} from "./components/Tina4Api";

export class Tina4 {
    constructor(config = null) {
        if (config === undefined || config === null) {
            if (Globals.defined() && Globals.get('config')) {
                config = Globals.get('config');
            } else {
                config = {defaultTarget: 'root'};
            }
        }
        console.log('Config found', config);
        Tina4.resolveRoutes(window.location.pathname, config.defaultTarget);
    }

    static initialize(config = null) {
        if (!Globals.defined()) {
            console.log('Initialize Tina4');
            Globals.initialize();
            Globals.set('routes', []);
            Globals.set('twig', Twig);
            localStorage.setItem('history', JSON.stringify([]));
            Tina4.registerComponents();
        }

        if (config !== null) {
            Globals.set('config', config);
        } else {
            Globals.set('config', {defaultTarget: 'root'});
        }

        //back navigation in the browser
        window.onpopstate=function(e){
            if (e.state) {
                let pathInfo = History.resolveHistory ();
                Tina4.resolveRoutes(pathInfo.path, pathInfo.target, 'GET', {});
            }
        }

        //add the navigate handler
        // @ts-ignore
        window.navigate = function (path, target = 'root', method: string = 'GET', data = null) {
            if (Globals.get('config').defaultTarget !== null) {
                target = Globals.get('config').defaultTarget;
            }

            Tina4.resolveRoutes(path, target, method, data);
        };
    }

    static registerComponents() {
        console.log('Register components');
        customElements.define('tina4-config', Tina4Config);
        customElements.define('tina4-api', Tina4Api);
    }

    static resolveRoutes(path, target, method: string = 'GET', data = null) {
        History.addHistory (path, target, method);
        return new Router(path, target, method, data).run();
    }

    static getFileExtension(filename) {
        let split = filename.trim().split('.');
        return split[split.length - 1];
    }

    static renderTemplate(content, params, callback) {
        if (this.getFileExtension(content) == 'twig') {
            try {
                Twig.twig(
                    {
                        id: content,
                        href: `/templates/${content}`,
                        async:true,
                        load: (template) => {
                            console.log(`Template loaded: `, template, params);
                            callback(template.render(params));
                        }
                    });
            }
            catch(exception) {
                callback( Twig.twig({ref: content}).render(params));
            }
        } else {
            let template = Twig.twig({data: content});
            callback( template.render(params));
        }
        return false;
    }
}