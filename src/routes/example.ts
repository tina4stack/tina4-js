import {Tina4} from "../../tina4/Tina4";
import {Get} from "../../tina4/Get";
import {Post} from "../../tina4/Post";

(new Get()).add('/test/hello', function (response, request) {
    let content = `<h1>Hello World Again!</h1>`;
    return response(content, 200, 'text/html')
});

(new Get()).add('/test', function (response, request) {
    let html = Tina4.renderTemplate(`<h1>Hello {{name}}!</h1><form target="root" method="post"><input type="text" name="firstName" value="{{firstName}}"><button>Send</button></form>`, {
            name: "Andre",
            firstName: "Andre"
        }
    );
    return response(html, 200, 'text/html')
});

(new Get()).add('/test/{id}', function (response, request) {
    console.log(request);
    let html = Tina4.renderTemplate(`<h1>Hello parsing params ok {{id}}!</h1>`, request);
    return response(html, 200, 'text/html');
});

(new Post()).add("/test", function (response, request) {
    console.log('POST', request);
    return response('You bellowed?', 200)
});


(new Get()).add('/', function (response, request) {
    let html = Tina4.renderTemplate(`index.twig`, {test: "Hello World!", title: "Index Page"});
    return response(html, 200, 'text/html');
});