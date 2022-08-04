import {Globals} from "./Globals";
export class Api {

    static sendRequest (request) {
        let api = Globals.get('api');
        if (api !== null) {
            console.log('Sending a request to', api);
            return ["hello", "world"];
        } else {
            console.log ('define tina4-api tag in index.html');
        }
    }

}