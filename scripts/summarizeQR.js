#!/usr/bin/env node

//include in UI eventually...
let axios = require('axios')
let fs = require("fs")

let commentIds = fs.readFileSync("./commentlinkids.json").toString()

console.log(commentIds)
console.log(JSON.parse(commentIds))
let hash = JSON.parse(commentIds)
//return

let qry = "https://canshare.co.nz/ds/fhir/QuestionnaireResponse"
let arComments = []
arComments.push("Url\tLinkId\tText\tSection text\tReviewer\tComment")
let config = {headers:{Authorization:'dhay'}}
axios.get(qry,config).then(
    function(response) {
        let bundle = response.data;
        //console.log(bundle)
        bundle.entry.forEach(function (entry) {
            let QR = entry.resource


            //get the reviewer
            let reviewer = ""
            if (QR.contained) {
                let pr = QR.contained[0]    //only possible resource
                if (pr.practitioner) {
                    reviewer = pr.practitioner.display
                }
                if (pr.organization) {
                    reviewer += "  " + pr.organization.display
                }
            }
            reviewer = reviewer || "Not known"



            QR.item.forEach(function (section) {
                section.item.forEach(function (child) {
                    let key = QR.questionnaire + ":" + child.linkId
                    if (hash[key]) {
                        let contents = hash[key]
                        if (child.answer) {
                            child.answer.forEach(function (ans) {

                                console.log(key, ans.valueString)
                                let comment = ans.valueString
                                comment = comment.replace(/\r\n|\r|\n/g ,' ');
                                let lne = QR.questionnaire + "\t" + contents.linkId + "\t" + contents.text + "\t" + contents.sectionText + "\t" + reviewer + "\t" + comment
                                arComments.push(lne)
                            })
                        }
                    }
                })

            })

        })
        let fle = arComments.join("\r\n")
        fs.writeFileSync("./allcomments.tsv",fle)

    }
)