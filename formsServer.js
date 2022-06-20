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





/* temp - need to update node on server

const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/';

const dbName = 'canshare';

// Database Name
//const dbName = 'canshare';
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
    }

    //client.close();
});

*/

app.use(bodyParser.json({limit:'50mb',type:['application/fhir+json','application/json']}))

let serverRoot = "http://localhost:9099/baseR4/"


const formsReceiverModule = require("./serverModuleFormsReceiver.js")
const formsManagerModule = require("./serverModuleFormsManager.js")
const dataServerModule = require("./serverModuleDataServer.js")
const backupModule = require("./serverModuleBackup");



formsReceiverModule.setup(app,serverRoot)
formsManagerModule.setup(app,serverRoot)
dataServerModule.setup(app,serverRoot)


//var db;
var port = process.env.port;
if (! port) {
    port=80;
}

server = http.createServer(app).listen(port);

app.use('/', express.static(__dirname,{index:'/frontPage.html'}));

console.log('server listening on port ' + port)