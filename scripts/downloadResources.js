#!/usr/bin/env node

/*
* Script to download resources to a json file
*
*
* */

let axios = require('axios')
let fs = require('fs')

//the server to copy resources from
let sourceServer = "https://canshare.co.nz/ds/fhir/"

downloadResources("Questionnaire")
downloadResources("QuestionnaireResponse")

let fileBase = "./backups/" + new Date().toISOString() + "-"


async function downloadResources(type) {
    let qry = sourceServer +  type
    console.log(qry)

    let config = {headers:{Authorization:'dhay'}}
    axios.get(qry,config).then(
        function(response) {
            let bundle = response.data;
            let fileName = fileBase + type + "-bundle.json"
            fs.writeFileSync(fileName,JSON.stringify(bundle))
            console.log("Wrote file: " + fileName)

        }
    ).catch(function(ex) {
        console.log(ex)
    })
}



