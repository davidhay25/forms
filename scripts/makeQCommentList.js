#!/usr/bin/env node


//make a list of all the Q comment linkIds - for use in the summarizer...

//include in UI eventually...
let axios = require('axios')
let fs = require('fs')
let qry = "https://canshare.co.nz/ds/fhir/Questionnaire"
let hash = {}       //hash by url
let config = {headers:{Authorization:'dhay'}}
axios.get(qry,config).then(
    function(response) {
        let bundle = response.data;
        console.log("loaded")
        bundle.entry.forEach(function (entry) {
            let Q = entry.resource
           /// hash[Q.url] = []    //will have a list of all comment linkIds

            if (Q.item) {
                Q.item.forEach(function (section) {
                    let sectionText = section.text
                    if (section.item) {
                        section.item.forEach(function (child) {

                            if (child.code) {
                                child.code.forEach(function (concept) {
                                    if (concept.system == 'http://clinfhir.com/fhir/CodeSystem/review-comment') {
                                        let key = Q.url + ":" + child.linkId
                                        hash[key] = {linkId: child.linkId,text:child.text,sectionText:sectionText}

                                        //hash[Q.url].push({linkId: child.linkId,text:child.text,sectionText:sectionText})
                                    }
                                })
                            }
                        })
                    }


                })
            }


        })
        console.log(hash)
        fs.writeFileSync("./commentlinkids.json",JSON.stringify(hash))
    }
)