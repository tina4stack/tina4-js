import {Route} from "./Route"
import {Router} from "./Router";

export class Get implements Route {
    private method : string = 'GET';
    add(path: string, callback): void {
        Router.add(this.method, path, callback)
    }
}