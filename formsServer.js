let fs = require('fs')
let http = require('http');
const https = require('https');

const bodyParser = require('body-parser')

var express = require('express');
var app = express();

const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';

const designerModule = require("./serverModuleDesigner.js")

// Database Name
const dbName = 'canshare';
let db
// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {

    console.log("Connected successfully to Mongodbserver");

    db = client.db(dbName);
    designerModule.setup(app,db)

    //client.close();
});

app.use(bodyParser.json({type:['application/fhir+json','application/json']}))

let serverRoot = "http://localhost:9099/baseR4/"


const formsReceiverModule = require("./serverModuleFormsReceiver.js")
const formsManagerModule = require("./serverModuleFormsManager.js")
const dataServerModule = require("./serverModuleDataServer.js")



formsReceiverModule.setup(app,serverRoot)
formsManagerModule.setup(app,serverRoot)
dataServerModule.setup(app,serverRoot)

//var db;
var port = process.env.port;
if (! port) {
    port=80;
}

server = http.createServer(app).listen(port);

app.use('/', express.static(__dirname,{index:'/dashboard.html'}));



console.log('server listening on port ' + port)