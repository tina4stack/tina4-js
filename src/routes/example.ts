import {Tina4} from "../../tina4/Tina4";
import {Get} from "../../tina4/Get";
import {Post} from "../../tina4/Post";
import {Api} from "../../tina4/Api";

(new Get()).add('/test/hello', function (response, request) {
    let content = `<h1>Hello World Again!</h1>`;
    response(content, 200, 'text/html')
});

(new Get()).add('/test', function (response, request) {
    Tina4.renderTemplate(`<h1>Hello {{name}}!</h1><form target="root" method="post"><input type="text" name="firstName" value="{{firstName}}"><button>Send</button></form>`, {
            name: "Andre",
            firstName: "Andre"
        }, function (html) {
            console.log('OOO');
            response(html, 200, 'text/html')
        }
    );
});

(new Get()).add('/test/{id}', function (response, request) {
    Tina4.renderTemplate(`<h1>Hello parsing params ok {{id}}!</h1>`, request, function(html) {
        response(html, 200, 'text/html');
    });
});

(new Post()).add("/test", function (response, request) {
    //Send and API request
    console.log('POST', request);
    Api.sendRequest('',  request, 'GET', function(result) {
        Tina4.renderTemplate(`contact.twig`, result, function(html){
            response(html, 200);
        });
    });
});


(new Get()).add('/', function (response, request) {
    Tina4.renderTemplate(`index.twig`, {test: "Hello World!", title: "Index Page"}, function(html) {
        response (html, 200, 'text/html');
    });
});