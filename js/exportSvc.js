angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('exportSvc', function($q,$http,formsSvc) {

        csReview = "http://canshare.com/cs/review"

            return {

                createJsonModel : function(Q) {
                    let hashAllItems = formsSvc.makeHashAllItems(Q)

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

                    //create a note based on any conditionals found in the item
                    function getConditionalNote(item,hashAllItemsXXX) {
                        let note = ""
                        if (item.enableWhen) {
                            item.enableWhen.forEach(function (ew) {
                                let source = hashAllItems[ew.question]
                                if (source) {
                                    note += "'" + source.item.text + "' is equal to "
                                    if (ew.answerCoding) {
                                        note += ew.answerCoding.display

                                    } else if (ew.answerBoolean) {
                                        note += ew.answerBoolean
                                    } else {
                                        note += "Unknown value"
                                    }

                                } else {
                                    note += "No item with a linkId of '"+ew.question + "' was found."
                                }
                            })

                        }
                        return note


                    }

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

                        entry.sourceStandard = meta.sourceStandard

                        entry.conditionalNotes = getConditionalNote(item)

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
                        entry.hisoClass = meta.hisoClass
                        entry.hisoLength = meta.hisoLength
                        entry.hisoDT = meta.hisoDT
                        entry.hisoLayout = meta.hisoLayout

                        /*

                        //hiso datatype. D
                        switch (item.type) {
                            case "string" :
                                entry.hisoDT = "Alphanumeric (X)"
                                entry.hisoSize = 100
                                entry.hisoLayout = "A(100)"
                                break
                            case "reference" :
                                entry.hisoDT = "Alphanumeric (X)"
                                entry.hisoSize = 100
                                entry.hisoLayout = "A(100)"
                                break
                            case "text" :
                                entry.hisoDT = "Alphanumeric (X)"
                                entry.hisoSize = 1000
                                entry.hisoLayout = "A(1000)"
                                break

                            case "choice" :
                            case "open-choice" :
                                entry.hisoSize = 18
                                entry.hisoDT = "Numeric (N)"
                                entry.hisoLayout = "N(18)"
                                break
                        }


                        entry.hisoDT = "Numeric (N)"
                        if (item.type == "text" || item.type == "string") {
                            entry.hisoDT = "Alphanumeric (X)"
                        }
*/
                        //create the


                        ar.push(entry)

                    }


                },
                
                createDownloadCSV : function(arJson) {
                    let arRows = []

                    let ar = []
                    ar.push("Category")
                    ar.push("Name")
                    ar.push("Description")
                    ar.push("Cardinality")
                    ar.push("Usage Notes")
                    ar.push("Obligation")
                    ar.push("Data Domain")
                    ar.push("Data Type")
                    ar.push("Representational Class")
                    ar.push("Field Size")
                    ar.push("Representational Layout")
                    arRows.push(ar.join(","))

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

                            line.push(makeSafe(row.hisoDT))
                            line.push(makeSafe(row.hisoClass))
                            line.push(makeSafe(row.hisoLength))
                            line.push(makeSafe(row.hisoLayout))

                            arRows.push(line.join(","))

                        })
                    })


                    return arRows.join("\r\n")
                    
                    function makeSafe(str) {
                        if (str) {
                            if (typeof str === 'number') {
                                str = str.toString()
                            }


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