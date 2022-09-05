let fs = require('fs')
let http = require('http');
const https = require('https');

const bodyParser = require('body-parser')

var express = require('express');
var app = express();

//email client
//const sgMail = require('@sendgrid/mail')
//const key = "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"     //todo move to file
//sgMail.setApiKey(key)

/* - one time test
const msg = {
    to: 'david.hay25@gmail.com', // Change to your recipient
    from: 'david.hay25@gmail.com', // Change to your verified sender
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
}
sgMail
    .send(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error(error)
    })

*/

const formsReceiverModule = require("./serverModuleFormsReceiver.js")
const formsManagerModule = require("./serverModuleFormsManager.js")
const dataServerModule = require("./serverModuleDataServer.js")
const backupModule = require("./serverModuleBackup");

//systemConfig is specific to a server environment - eg design, production etc
//default to design (which enables the 'publish button')
let systemConfig
try {
     systemConfig = require("./artifacts/systemConfig.json")
} catch (ex) {
    systemConfig = {type:"design","publicServer":"https://canshare.co.nz",port:9090,serverRoot : "http://localhost:9099/baseR4/"}
}
//serverRoot = serverRoot ||
//allows multiple instances of the app (with associated hapi) on the same VM. Not actually using this ATM
let serverRoot = systemConfig.serverRoot  || "http://localhost:9099/baseR4/"
console.log("FHIR Server root " + serverRoot)

var port = process.env.port;
if (! port) {
    // temp - really need this port=80;
    port = systemConfig.port;
}


console.log("Config settings:",JSON.stringify(systemConfig))

const { MongoClient } = require('mongodb')
const uri = 'mongodb://localhost:27017/'

const dbName = 'canshare'
let db
// Use connect method to connect to the server
//Note there seems to be a timeout of around 30 secs that I can't change....
MongoClient.connect(uri, function(err, client) {
    if (err) {
        console.log('Unable to connect to the MongoDb server. Backups not enabled.')
    } else {
        console.log("Connected successfully to Mongodb server");
        db = client.db(dbName);
        const backupModule = require("./serverModuleBackup")
        backupModule.setup(app,serverRoot,db)
        formsReceiverModule.setDb(db)
    }

    //client.close();
});

app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json']}))

formsReceiverModule.setup(app,serverRoot)   //the module needs access to the app so that any processing errors can be logged
formsManagerModule.setup(app,serverRoot,systemConfig)
dataServerModule.setup(app,serverRoot,systemConfig)

//return the system config so the client can adjust the UI (eg hide / show the publish button
app.get('/config',function(req,res) {
    res.json(systemConfig)
})

//var db;


let server;

try {
    // Certificate - https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/canshare.co.nz/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/canshare.co.nz/cert.pem', 'utf8');
    const ca = fs.readFileSync('/etc/letsencrypt/live/canshare.co.nz/chain.pem', 'utf8');

    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };

    //const httpsServer = https.createServer(credentials, app);
    server = https.createServer(credentials, app);
    server.listen(443, () => {
        console.log('HTTPS Server running on port 443');

        //redirect for http
        http.createServer(function (req, res) {
            res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
            res.end();
        }).listen(80);

    });

} catch (ex) {
    console.log("SSL not enabled, starting HTTP server (temp for developing)")

    server = http.createServer(app).listen(port);
    console.log('server listening on port ' + port)

}


//app.use('/', express.static(__dirname,{index:'/frontPage.html'}));
app.use('/', express.static(__dirname,{index:'/dataStandards.html'}));
