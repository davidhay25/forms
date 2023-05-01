#!/usr/bin/env node

/*
* Script to download resources and save to files
*
*
* */
let fs = require("fs")
let axios = require('axios')

let fileRoot="backups/"

//the server to copy resources from
//let sourceServer = "http://design.canshare.co.nz/ds/fhir/"
let sourceServer = "https://canshare.co.nz/ds/fhir/"


