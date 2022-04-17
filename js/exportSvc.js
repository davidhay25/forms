angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('exportSvc', function($q,$http,formsSvc) {

        csReview = "http://canshare.com/cs/review"

            return {

                createJsonModel : function(Q,hashAllItems) {
                    let arModel = []

                    if (Q.item) {
                        Q.item.forEach(function (section){
                            let sectionLines = {display:section.text,lines:[]}
                            arModel.push(sectionLines)
                            if (section.item) {
                                section.item.forEach(function(child){
                                    makeEntry(child, formsSvc.getMetaInfoForItem(child), section,sectionLines.lines)
                                    if (child.item) {
                                        child.item.forEach(function (grandchild) {
                                            makeEntry(grandchild, formsSvc.getMetaInfoForItem(grandchild), section,sectionLines.lines)
                                        })
                                    }
                                })
                            }
                        })
                    }

//console.log(arModel)
                    return arModel

                    function makeEntry(item,meta,section,ar) {
                        //ignore 'reviewer comments' elements
                        if (item.code && item.code[0].system == csReview) {
                            return
                        }

                        let entry = {}
                        entry.item = item       //for the edit option
                        entry.linkId = item.linkId
                        entry.name = item.text
                        entry.description = meta.description || ""
                        entry.category = section.text
                        entry.usageNotes = meta.usageNotes || ""

                        if (item.required) {
                            if (item.enableWhen) {
                                let ew = item.enableWhen[0]
                                entry.obligation = "Conditional"
                                let master = hashAllItems[ew.question]
                                if (master) {
                                    entry.usageNotes = entry.usageNotes || ""
                                    entry.usageNotes += "Mandatory when " + master.item.text + " = " + ew.answerCoding.code
                                }

                            } else {
                                entry.obligation = "Mandatory"
                            }

                        } else {
                            entry.obligation = "Optional"
                        }
                        
                        if (item.answerOption && (item.type == 'choice' || item.type== 'open-choice')) {
                            let dd = ""
                            item.answerOption.forEach(function (ao) {
                                dd += ao.valueCoding.display + "; "
                            })
                            entry.dataDomain = dd
                        } else {
                            if (item.answerValueSet) {
                                //todo ??? what to do
                            }
                        }

                        let min = "0"
                        let max = "1"
                        if (item.repeats) {max = "*"}
                        if (item.required) {min = "1"}

                        entry.cardinality = min + ".." + max

                        ar.push(entry)

                    }


                },
                
                createDownloadCSV : function(arJson) {
                    let arRows = []
                    arJson.forEach(function (section) {
                        section.lines.forEach(function (row) {
                            let line = []
                            line.push(makeSafe(row.category))
                            line.push(makeSafe(row.name))
                            line.push(makeSafe(row.description))
                            line.push(makeSafe(row.cardinality))
                            line.push(makeSafe(row.usageNotes))
                            line.push(makeSafe(row.obligation))
                            line.push(makeSafe(row.dataDomain))
                            arRows.push(line.join(","))

                        })
                    })


                    return arRows.join("\r\n")



                    function makeSafe(str) {
                        if (str) {
                            //convert commas to spaces
                            str = str.replace(/,/g, " ")

                            //convert double to single quote
                            str = str.replace(/"/g, "' '")
                        }
                        return str

                    }
                }
            }
        }


    )