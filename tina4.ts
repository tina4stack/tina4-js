console.log ('Firing');
import {Tina4} from "./tina4/Tina4";
import "./src/routes/**";

var tina4 = new Tina4();

// @ts-ignore
window.navigate = function(path, target='root', method:string='GET', data = null) {
    history.pushState({}, '', path);
    tina4.init(path, target, method, data);
};


tina4.init(window.location.pathname, 'root');
