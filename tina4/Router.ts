import {Tina4} from "./Tina4";

export class Router {

    private readonly url: string;
    private readonly target:  string;
    private readonly method:  string;
    private readonly data;
    private matchesPath;
    private matchesUrl;
    private params;
    private matched;

    constructor(url, target, method, data=null)  {
        console.log('Constructing', url, target, method, data);
        if (method === undefined) method = 'GET';
        this.url = url;
        this.target = target;
        this.method = method;
        this.data = data;
    }

    static add(method, path, callback) {
        Tina4.initialize();
        console.log('Adding Route', method, path);
        if (window['tina4'] !== undefined) {
            window['tina4']['routes'].push({method: method, path: path, callback: callback});
        }
    }

    static response(content, httpCode, contentType) {
        console.log('Response', content, httpCode, contentType);
        //manipulate content based on the contentType
        return content;
    }

    //https://stackoverflow.com/questions/831030/how-to-get-get-request-parameters-in-javascript
    getRequestParams() {
        let s1 = location.search.substring(1, location.search.length).split('&'),
            r = {}, s2, i;
        for (i = 0; i < s1.length; i += 1) {
            s2 = s1[i].split('=');
            r[decodeURIComponent(s2[0])] = decodeURIComponent(s2[1]);
        }

        if (JSON.stringify(r) == '{"":"undefined"}') return {};
        return r;
    };

    cleanUrl(url) {
        const regex = /(.*)\/\/(.*)\//g;
        url = url.replace(regex, '/').replace('#','');
        return url;
    }

    match (url:string, path:string, method:string): boolean {
        if  (this.method !== method) return false;
        url = this.cleanUrl(url);
        console.log('Matching', url, path, method);
        const  urlExpression  =  /(.*)\/(.*)|{(.*)}/g;
        const  pathExpression  =  /(.*)\/(.*)|{(.*)}/g;

        if (url === path) {
            return true;
        } else {
            this.matchesUrl = urlExpression.exec (url);
            this.matchesPath = pathExpression.exec (path);
            if (this.matchesUrl.length === this.matchesPath.length) {
                this.matched = true;
                this.matchesUrl.every(function (urlPath, index) {
                    if (index !== 0 && urlPath !== undefined) {
                        //console.log('Matching', urlPath, this.matchesPath[index]);
                        if (urlPath !== this.matchesPath[index] && this.matchesPath[index][0] !== '{') {
                            //console.log('Not matching', url, path);
                            this.matched = false;
                            return false;
                        } else if (this.matchesPath[index][0] === '{') {
                            this.params[this.matchesPath[index].replace('{', '').replace('}', '')] = urlPath;
                            this.matched = true;
                        }
                    }
                    return true;
                }, this);
                if (this.matched) return true;
            } else {
                return false;
            }
        }
    }

    parse(url: string, target: string, callback) {
        console.log (window['tina4']['routes']);
        window['tina4']['routes'].every(function(route){
            console.log('looking', route.path, url);
            if (this.match(url, route.path, route.method )) {
                let html = route.callback( Router.response, this.params );
                if (!html) { //try again if we failed the first time - twig async is not working
                    html = route.callback( Router.response, this.params );
                }
                return callback ( target, html );
            }
            return true;
        }.bind(this));
    }

    submitHandler(event) {
        if (event.preventDefault) event.preventDefault();
        let form = event.target;
        console.log ('Form', form.action, window.location.pathname, form);
        if (form.action === undefined) form.action = window.location.pathname;

        // @ts-ignore
        window.navigate(form.action, form.getAttribute("target") , 'POST', form);
    }

    run() {
        // @ts-ignore
        window.submitHandler = this.submitHandler;
        this.params = this.getRequestParams();
        this.params.data = this.data;
        this.parse(this.url, this.target, function (target, content) {
            console.log ('Target', target, content);
            if (document.getElementById(target) !== null) {
                document.getElementById(target).innerHTML = content;
                //Attach the form submit handler
                let forms = Array.prototype.slice.call(document.getElementsByTagName('form'));
                forms.forEach(function (form) {
                    console.log('Found form', form.method);
                    if (form.attachEvent) {
                        // @ts-ignore
                        form.attachEvent("submit", window.submitHandler);
                    } else {
                        // @ts-ignore
                        form.addEventListener("submit", window.submitHandler);
                    }
                });
            } else {
                console.log('Cannot find route')
            }
        });
    }
}


