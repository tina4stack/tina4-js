# Tina4js - This is not another Framework for Javascript #

Right now there is not much to see, but you can start playing by following these instructions

#### Installing Parcel
```
npm install --save-dev parcel
```

#### Installing Tina4js
```
npm install tina4js
```

#### Create the src folders
Linux / MacOS
```
mkdir src
mkdir src/routes
mkdir src/templates
```
Windows
```
mkdir src
mkdir src\routes
mkdir src\templates
```

#### Create .parcelrc file
```
echo {"extends": "@parcel/config-default","resolvers": ["@parcel/resolver-glob", "..."],"reporters":  ["...", "parcel-reporter-static-files-copy"]} > .parcelrc
```

#### Create index.html

```html
<!DOCTYPE html>
<html>
<head>
    <title>Tina4 JS</title>
</head>
<body>
<tina4-api url="https://randomuser.me/api/" token=""></tina4-api>
<div id="root"></div>
<script type="module" src="node_modules/tina4js/tina4.ts"></script>
</body>
</html>
```

#### Add static paths & scripts
```json
{
  "devDependencies": {
  },
  "dependencies": {
    "tina4js": "^0.0.1"
  },
  "staticFiles": {
    "staticPath": "src/templates",
    "staticOutPath": "templates"
  },
  "scripts": {
    "start": "parcel index.html",
    "build": "parcel build"
  }
}
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
