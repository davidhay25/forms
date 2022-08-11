#!/usr/bin/env node

/* An update scrip to copy tags from the meta data to an extension. Should only be run once,
 */


let axios = require('axios')
let serverBaseUrl = "http://localhost:9099/baseR4/"
let appHostUrl =  "http://localhost:9099/baseR4/"

let tagFolderSystem = "http://clinfhir.com/fhir/NamingSystem/qFolderTag"
let extFolderTag = "http://clinfhir.com/fhir/StructureDefinition/canshare-questionnaire-folder-tag"

update()


async function update() {
    let url = serverBaseUrl +  "Questionnaire?status:not=retired&_count=50"


    axios.get(url).then(
        async function(response) {
            let bundle = response.data;

            bundle.entry.forEach(function (entry) {
                let Q = entry.resource
                console.log(Q.id)

                if (Q.meta && Q.meta.tag) {
                    Q.meta.tag.forEach(function (tag) {
                        if (tag.system == 'http://clinfhir.com/fhir/NamingSystem/qFolderTag') {
                            console.log(tag.system,tag.code)

                            let extTag = {system:tagFolderSystem,code:tag.code}
                            Q.extension = Q.extension || []

                            //ensure that tag not already there (in case run multiple times)

                            let found = false
                            Q.extension.forEach(function (ext) {
                                if ((ext.url == extFolderTag) && (ext.valueString == tag.code)) {
                                    found = true
                                }
                            })

                            if (! found) {
                                console.log("Update extension")
                                Q.extension.push({url:extFolderTag,valueString:tag.code})
                                console.log(Q.extension)
                                let url = serverBaseUrl +  "Questionnaire/"+ Q.id
                                axios.put(url,Q).then(
                                    function(data) {
                                        console.log(data.status)
                                    }
                                )
                                //update here
                            } else {
                                console.log("Extension already present")
                            }

                            console.log("")

                        }

                    })
                }



            })


        }
    ).catch((ex) => {
        console.log(ex.code)
    })
}

