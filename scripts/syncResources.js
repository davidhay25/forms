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
let targetServer = "http://localhost:9099/baseR4/"

syncResources("Questionnaire")
//syncResources("Observation")

function syncResources(type) {
    let qry = sourceServer +  type
    console.log(qry)

    let config = {headers:{Authorization:'dhay'}}
    axios.get(qry,config).then(
        function(response) {
            let bundle = response.data;

            //now convert the response bundle into a transaction
            bundle.type = "transaction"
            bundle.entry.forEach(function (entry){
                let resource = entry.resource
                entry.request = {method:'PUT'}
                entry.request.url = resource.resourceType + "/" + resource.id
            })
            //now post to the target server
            axios.post(targetServer,bundle).then(
                function(response) {
                    console.log("Target server updated")
                }
            ).catch(function (ex) {
                console.log("error POSTing transaction to target server")
                console.log(bundle)

            })



        }
    ).catch(function(ex) {
        console.log("Error: " + ex.response.status)
    })
}



