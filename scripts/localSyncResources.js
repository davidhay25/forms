#!/usr/bin/env node

/*
* Script to update resources from one server from another.
*
*
* */
let fs = require("fs")
let axios = require('axios')

let fileRoot="backups/"

//the server to copy resources from
//let sourceServer = "http://design.canshare.co.nz/ds/fhir/"
let sourceServer = "https://canshare.co.nz/ds/fhir/"

//let sourceServer = "http://localhost:9090/ds/fhir/"

//the server to copy resources to
let targetServer = "http://localhost:9099/baseR4/"

//let targetServer = "http://design.canshare.co.nz:9999/baseR4/"


//let targetServer = "http://backup.canshare.co.nz:9099/baseR4/"
//let targetServer = "http://188.166.76.237:9099/baseR4/"  //the backup server

console.log("Source server: " + sourceServer)
console.log("Target server: " +targetServer)

syncResources("Questionnaire")
//syncResources("Observation")
syncResources("QuestionnaireResponse")
syncResources("Observation")

async function syncResources(type) {
    let qry = sourceServer +  type
    console.log(qry)

    let config = {headers:{Authorization:'dhay'}}
    axios.get(qry,config).then(
        function(response) {
            let bundle = response.data;

            //save to a local file
            let fileName = fileRoot + type + "-" + new Date().toISOString() + ".json"
            fs.writeFileSync(fileName,JSON.stringify(bundle))

            let newBundle = {'resourceType':"Bundle",type:'transaction',entry:[]}

            //now convert the response bundle into a transaction
            bundle.type = "transaction"
            delete bundle.link
            console.log(qry + " " + bundle.entry.length + " entries returned")
            bundle.entry.forEach(function (entry){
                delete entry.fullUrl
                delete entry.search
                let resource = entry.resource
                entry.request = {method:'PUT'}
                entry.request.url = resource.resourceType + "/" + resource.id

                let id = entry.resource.id
                if (! parseInt(id)) {
                    newBundle.entry.push(entry)
                } else {
                    console.log(`Ignoring ${resource.resourceType}/${resource.id} ` )
                }
            })


            //now post to the target server

            axios.post(targetServer,newBundle).then(
                function(response) {
                    console.log(type)
                    console.log("Target server updated - " + newBundle.entry.length + " entries")
                }
            ).catch(function (ex) {
                console.log("error POSTing transaction to target server",ex.response.data)

                //console.log(bundle)

            })



        }
    ).catch(function(ex) {
        console.log("Error: " + ex)
    })
}



