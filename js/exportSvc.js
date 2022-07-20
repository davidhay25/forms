angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('exportSvc', function($q,$http,formsSvc) {

        csReview = "http://clinfhir.com/fhir/CodeSystem/review-comment"

            return {

                createAuditModelDEP : function(Q){
                    //a flat model intended to show key elements for audit purposes

                    let arReport = []

                    if (Q.item) {
                        Q.item.forEach(function (section){
                            //let sectionLines = {display:section.text,lines:[]}
                            //arModel.push(sectionLines)
                            if (section.item) {
                                section.item.forEach(function(child){
                                    createLine(child, formsSvc.getMetaInfoForItem(child), section,sectionLines.lines)
                                    if (child.item) {
                                        child.item.forEach(function (grandchild) {
                                            createLine(grandchild, formsSvc.getMetaInfoForItem(grandchild), section,sectionLines.lines)
                                        })
                                    }
                                })
                            }
                        })
                    }

                    function createLine() {

                    }

                },

                createV2Report : function(Q) {
                    let commentSystemUrl = "http://clinfhir.com/fhir/CodeSystem/review-comment"
                    //generate a report for a v2 definition. Only suitable for 'data' sections - not admin or demographics
                    let arModel = []

                    if (Q.item) {
                        Q.item.forEach(function (section){
                            if (includeSection(section)) {
                                // the section itself doesn't have any output into the v2 message, but is useful in the display
                                let item = {type:'section',item:section}
                                arModel.push(item)
                                if (section.item) {
                                    section.item.forEach(function(child){

                                        if (child.item) {
                                            //create an OBR entry
                                            let item = {type:'OBR',item:child}
                                            arModel.push(item)
                                            child.item.forEach(function (grandchild) {
                                                //An OBX for each child item
                                                let item = {type:'OBX',item:grandchild}
                                                addOBX(arModel,item)
                                                //arModel.push(item)
                                            })
                                        } else {
                                            // an OBX only
                                            let item = {type:'OBX',item:child}
                                            addOBX(arModel,item)
                                            //arModel.push(item)
                                        }
                                    })
                                }

                            }


                        })
                    }


                    return arModel

                    function includeSection(section) {
                        if (section.linkId == 'demog' || section.linkId == 'admin') {
                            return false
                        }
                        return true

                    }

                    function addOBX(arModel,item) {
                        let canAdd = true
                        if (item.item.code) {
                            item.item.code.forEach(function (code) {
                                if (code.system == commentSystemUrl) {
                                    canAdd = false
                                }
                            })
                        }

                        if (item.item.answerOption) {
                            item.optionsHash = {}
                            item.item.answerOption.forEach(function (opt) {
                                if (opt.valueCoding) {
                                    let system = opt.valueCoding.system || "unknown"
                                    item.optionsHash[system] = item.optionsHash[system] || []
                                    item.optionsHash[system].push(opt.valueCoding)
                                }

                            })
                        }



                        if (canAdd) {
                            arModel.push(item)
                        }

                    }
                },

                createJsonModel : function(Q) {
                    ////add guide for use , source standards, unit of measure, conditional
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

                        entry.type = item.type
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

                                    if (ew.answerCoding) {
                                        entry.usageNotes += "Mandatory when " + master.item.text + " = " + ew.answerCoding.code
                                    } else if (ew.answerBoolean) {
                                        entry.usageNotes += "Mandatory when " + master.item.text + " = " + ew.answerBoolean
                                    } else if (ew.answerString) {
                                        entry.usageNotes += "Mandatory when " + master.item.text + " = " + ew.answerString
                                    } else if (ew.answerInteger !== undefined) {
                                        entry.usageNotes += "Mandatory when " + master.item.text + " = " + ew.answerInteger
                                    }
/*
                                        <span ng-show = "ew.answerCoding"> {{ew.answerCoding.code}} ({{ew.answerCoding.display}})</span>
                                    <span ng-show = "ew.answerBoolean !== undefined"> {{ew.answerBoolean}}</span>
                                    <span ng-show = "ew.answerString">{{ew.answerString}}</span>
                                    <span ng-show = "ew.answerInteger !== undefined">{{ew.answerInteger}}</span>
*/




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
                        entry.UOM = meta.UOM
                        entry.verification = meta.verification


                        //UOM
                        entry.UOM = meta.UOM


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

                        //set the type of entry - section, group or plain item


                        ar.push(entry)

                    }


                },
                createDownloadCSV : function(arJson) {
                    //create a download csv from the json file created by createJsonModel

                   // entry.usageNotes = meta.usageNotes || ""
                    //entry.sourceStandard = meta.sourceStandard
                    //entry.conditionalNotes = getConditionalNote(item)

                    //add guide for use , source standards, unit of measure, conditional

                    let arRows = []

                    let ar = []
                    ar.push("Section")
                    ar.push("Name")
                    ar.push("Definition")

                    ar.push("Data Domain")
                    ar.push("Obligation")

                    ar.push("Cardinality")
                    ar.push("Guide for use")
                    ar.push("Source Standard")

                    ar.push("Data Type")
                    ar.push("Representational Class")
                    ar.push("Field Size")
                    ar.push("Representational Layout")

                    ar.push("UOM")
                    ar.push("Verification")
                    ar.push("Conditional")
                    arRows.push(ar.join(","))

                    arJson.forEach(function (section) {
                        section.lines.forEach(function (row) {
                            let line = []
                            line.push(makeSafe(row.category))   //==section
                            line.push(makeSafe(row.name))
                            line.push(makeSafe(row.description))

                            line.push(makeSafe(row.dataDomain))
                            line.push(makeSafe(row.obligation))
                            line.push(makeSafe(row.cardinality))
                            //line.push(makeSafe(row.usageNotes))

                            line.push(makeSafe(row.usageNotes))
                            line.push(makeSafe(row.sourceStandard))


                            line.push(makeSafe(row.hisoDT))
                            line.push(makeSafe(row.hisoClass))
                            line.push(makeSafe(row.hisoLength))
                            line.push(makeSafe(row.hisoLayout))

                            line.push(makeSafe(row.UOM))

                            line.push(makeSafe(row.verification))

                            line.push(makeSafe(row.conditionalNotes))


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
                            str = str.replace(/"/g, "'")
                            //str = str.replace(/"/g, "' '")
                        }
                        return str

                    }
                },
                createDownloadCSVDEP : function(arJson) {
                    //create a download csv from the json file created by createJsonModel




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
                    ar.push("Verification")
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
                            line.push(makeSafe(row.verification))
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