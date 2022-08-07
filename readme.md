# Tina4js - This is not another Framework for Javascript #

Begin your Tina4 journey by following these steps

#### Install Parcel
Parcel is a great tool to use whilst developing your project, not only does it allow you to use type script but it will bundle your project into a dist folder automatically.
```
npm install --save-dev parcel
```

#### Installing Tina4js
We've tried to make installing Tina4js as easy as possible, this should result in a working project.
```
npm install tina4js
npm install -g tina4js
tina4 install
```

#### Running your project
```
npm run start
```

#### Examples of routes

```ts
import {Get} from "tina4js/tina4/Get";
import {Tina4} from "tina4js/tina4/Tina4";

(new Get()).add('/test/hello', function (response, request) {
    let content = `<h1>Hello World Again!</h1>`;
    return response(content, 200, 'text/html')
});

(new Get()).add('/test', function (response, request) {
    Tina4.renderTemplate(`<h1>Hello {{name}}!</h1><form target="root" method="post"><input type="text" name="firstName" value="{{firstName}}"><button>Send</button></form>`, {
            name: "Tina4",
            firstName: "Tina4"
        }, function (html) {
            return response(html, 200, 'text/html')
        }
    );
});

(new Get()).add('/test/{id}', function (response, request) {
    Tina4.renderTemplate(`<h1>Hello parsing params ok {{id}}!</h1>`, request, function(html) {
       return response(html, 200, 'text/html');
    });
});

(new Get()).add('/', function (response, request) {
    Tina4.renderTemplate(`index.twig`, {test: "Hello World!", title: "Index Page"}, function(html) {
        return response (html, 200, 'text/html');
    });
});

```

#### Post Routes
This is configured using the tina4-api tag in the index.html file
```ts
import {Post} from "tina4js/tina4/Post";
import {Api} from "tina4js/tina4/Api";
import {Tina4} from "tina4js/tina4/Tina4";

(new Post()).add("/test", function (response, request) {
    //Send and API request
    console.log('POST WORKING', request);
    Api.sendRequest('',  request, 'GET', function(result) {
        Tina4.renderTemplate(`contact.twig`, result, function(html){
            return response(html, 200);
        });
    });
});
```

### Examples of templates

base.twig
```twig base.twig
<div>
    <nav>
        <h1>Hello World Hello</h1>
        <a href="#" onclick="navigate('/')">Home</a>
        <a href="#" onclick="navigate('/test/hello')">Test</a>
        <a href="#" onclick="navigate('/test/Hello')">Hello</a>
        <a href="#" onclick="navigate('/test')">Hello</a>
    </nav>
</div>
<div>
    {% block content %}
        Here is content
    {% endblock %}
</div>
```

index.twig
```twig index.twig 
{% extends "base.twig" %}
{% block content %}
    {{ test }}
{% endblock %}
```

contact.twig - tied to the POST route above
```twig contact.twig
<h1>API Results</h1>
{% for result in results %}
    {{result.name.first}}
    <img src="{{result.picture.large}}">
{% endfor %}
```

#### Running

```
npm start
```

Components

| Component | Example                                                       |
|-----------|---------------------------------------------------------------|
| tina4-api | ```<tina4-api url="https://randomuser.me/api/" token="" />``` |
