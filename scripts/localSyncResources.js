#!/usr/bin/env node

/*
* Script to update one server from another.
*
*
* */

let axios = require('axios')

//the server to copy resources from
let sourceServer = "http://canshare.clinfhir.com/ds/fhir/"
//let sourceServer = "http://localhost:9090/ds/fhir/"

//the server to copy resources to
//let targetServer = "http://localhost:9099/baseR4/"
let targetServer = "http://canshare.co.nz:9099/baseR4/"

syncResources("Questionnaire")
syncResources("Observation")
syncResources("QuestionnaireResponse")


async function syncResources(type) {
    let qry = sourceServer +  type
    console.log(qry)

    let config = {headers:{Authorization:'dhay'}}
    axios.get(qry,config).then(
        function(response) {
            let bundle = response.data;

            let newBundle = {'resourceType':"Bundle",type:'transaction',entry:[]}

            //now convert the response bundle into a transaction
            bundle.type = "transaction"
            delete bundle.link
            console.log(bundle.entry.length + " entries returned")
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
        console.log("Error: " + ex.response.status)
    })
}



