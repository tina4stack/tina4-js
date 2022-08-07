#! /usr/bin/env node
//get some params
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const currentDir = process.cwd();
if (args) {
    switch (args[0]) {
        case 'install':
                let installPath = path.join(currentDir, '/test');
                console.log(`Installing to ${installPath}...`);
                install(installPath);
            break;
    }
}

function install(installPath) {
    const indexHtmlContent = `<!DOCTYPE html>
<html>
    <head>
        <title>My Tina4Js App</title>
    </head>
    <body>
        <tina4-api url="https://randomuser.me/api/" token=""></tina4-api>
        <div id="root"></div>
        <script type="module" src="node_modules/tina4js/tina4.ts"></script>
    </body>
</html>
`;
    const parcelRcContent = `{
    "extends": "@parcel/config-default",
    "resolvers": ["@parcel/resolver-glob", "..."],
    "reporters":  ["...", "parcel-reporter-static-files-copy"]
}
`;

    fs.access(installPath, (err) => {
        if (err) {
            console.log('Creating installation path ...');
            fs.mkdirSync(installPath);
        }

        if (!fs.existsSync(path.join(installPath, 'src'))) {
            fs.mkdirSync(path.join(installPath, 'src'));
        };

        if (!fs.existsSync(path.join(installPath, 'src', 'routes'))) {
            fs.mkdirSync(path.join(installPath, 'src', 'routes'));
        };

        if (!fs.existsSync(path.join(installPath, 'src', 'templates'))) {
            fs.mkdirSync(path.join(installPath, 'src', 'templates'));
        };


        let indexHtmlFile = path.join(installPath, 'index.html');
        if (!fs.existsSync(indexHtmlFile)){
            fs.writeFileSync(indexHtmlFile, indexHtmlContent);
        }

        let parcelRcFile = path.join(installPath, '.parcelrc');
        if (!fs.existsSync(parcelRcFile)){
            fs.writeFileSync(parcelRcFile, parcelRcContent);
        }

        //add the relevant sections to the package.json
        let packageFile = path.join(installPath, 'package.json');
        if (fs.existsSync(packageFile)) {
            console.log ('Configuring package.json ...');
            fs.readFile(packageFile, 'utf8', (err, data) => {
                let packageJSON = JSON.parse(data);

                if (!packageJSON.name) {
                    packageJSON['name'] = path.basename(installPath);
                }

                if (!packageJSON.description) {
                    packageJSON['description'] = 'Another tina4js project';
                }

                if (!packageJSON.version) {
                    packageJSON['version'] = '1.0.0';
                }

                if (!packageJSON.staticFiles) {
                    packageJSON['staticFiles'] = {};
                    packageJSON['staticFiles']['staticPath'] = 'src/templates';
                    packageJSON['staticFiles']['staticOutPath'] = 'templates';
                }

                if (!packageJSON.scripts) {
                    packageJSON['scripts'] = {};
                    packageJSON['scripts']['start'] = 'parcel index.html';
                    packageJSON['scripts']['build'] = 'parcel build';
                }

                fs.writeFileSync(packageFile, JSON.stringify(packageJSON, null, '\t'));
            });
        } else {
            console.log('Please make sure you have run `npm install tina4js` in this folder');
        }
    });
}