import {Route} from "./Route"
import {Router} from "./Router";

export class Post implements Route {
    private method : string = 'POST';
    add(path: string, callback): void {
        Router.add(this.method, path, callback)
    }
}