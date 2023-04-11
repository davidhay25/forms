angular.module("formsApp")

    .service('termIOSvc', function(formsSvc) {

        return {


            "makeExportQ" : function(Q) {
                //make a term export
                let that = this
                let arAllExport = []

                //need to create a hash of all items for the usage notes (needed for the conditional)
                let hashAllItems = {}
                Q.item.forEach(function (section) {
                    hashAllItems[section.linkId] = section
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.item) {
                                child.item.forEach(function (gc) {
                                    hashAllItems[gc.linkId] = gc
                                })
                            } else {
                                hashAllItems[child.linkId] = child
                            }

                        })
                    }
                })



                let arHeader = ["Section","Group","Item","linkId","qCode","qDisplay","qSystem","Extract type","DataType","Description","Obligation","Condition","Guide for use","Repeats","Hidden","Exclude","ValueSet","oDisplay","oCode","oTerm","oSystem"]
                arAllExport.push(arHeader.join('\t'))
                Q.item.forEach(function (section) {
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.type == 'group' && child.item) {
                                child.item.forEach(function (grandChild) {
                                    let ar = that.makeExportOneItem(arAllExport,grandChild,Q,section,child,hashAllItems)


                                })
                            } else {
                                //this is a data item
                                let ar = that.makeExportOneItem(arAllExport,child,Q,section,null,hashAllItems)



                            }

                        })
                    }
                })

                return arAllExport
            },

            "UpdateFromFileDEP" : function (item,file,Q) {
                //assume that each line is an item in the options.
                let linkId = item.linkId    //the item being updated
                let arFile = file.split("\r\n")

                let updatedConditionals = []

                let arOption = []
                let hashCurrent = {}    //store a hash of existing system / code for dependency check

                for (var i=6;i<arFile.length;i++ ) {
                    let row = arFile[i]
                    let ar = row.split('\t')

                    let display = ar[0]
                    let newSystem = ar[1]
                    let newCode = ar[2]
                    let currentSystem = ar[3]
                    let currentCode = ar[4]
                    let key = currentSystem + "|" + currentCode         //what any dependency will currently be using
                    let value = [newSystem,newCode]               //the new value for that dependency
                    hashCurrent[key] = value

                    let coding = {system:newSystem,code:newCode,display:display}
                    arOption.push({valueCoding:coding})

                }
                //now move through the Q to: a) locate the item and update it and b) update any dependencies
                Q.item.forEach(function (section) {
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.type == 'group' && child.item) {
                                child.item.forEach(function (grandChild) {
                                    checkDataItem(linkId,grandChild,arOption)
                                })
                            } else {
                                //this is a data item
                                checkDataItem(linkId,child,arOption)
                            }
                        })
                    }
                })

                return {options:arOption, updatedConditionals:updatedConditionals}

                function checkDataItem(linkID,item,arOptions) {
                    //check an item to see if it is either the one to update or has a dependency that needs updatin
                    if (item.linkId == linkId) {
                        //this is the item that the answerOptions should be added to
                        item.answerOption = arOptions
                        console.log('updated item')
                    } else {
                        //Not the item to update. Check for dependencies
                        if (item.enableWhen) {
                            item.enableWhen.forEach(function (ew) {
                                let currentKey = ew.answerCoding.system + "|" + ew.answerCoding.code
                                let arNewValues = hashCurrent[currentKey]
                                if (arNewValues) {
                                    ew.answerCoding.system = arNewValues[0]
                                    ew.answerCoding.code = arNewValues[1]
                                    updatedConditionals.push(item.linkId)
                                    console.log('updated conditional')
                                }

                            })
                        }
                    }
                }

            },
            "makeExportOneItemOLD" : function(item,Q,section) {
                //make an array with coding answerOptions for the item
                let ar = []
                let meta = formsSvc.getMetaInfoForItem(item)
                //if (item.answerOption && item.type == 'choice') {
                    ar.push(["Q",Q.name].join('\t'))
                    ar.push(["Section",section.text].join('\t'))
                    ar.push(["linkId",item.linkId].join('\t'))
                    ar.push(["text",item.text].join('\t'))
                    ar.push(["description",meta.description].join('\t'))
                    //ar.push(item.description)
                    ar.push("")
                    ar.push("Display (edit)\tSystem (edit)\tCode (edit)\tCurrent system (leave)\tCurrent code (leave)")
                    if (item.answerOption) {
                        item.answerOption.forEach(function (value) {
                            let arLne = []

                            arLne.push(value.valueCoding.display)
                            arLne.push(value.valueCoding.system)
                            arLne.push(value.valueCoding.code)
                            //arLne.push(value.valueCoding.system)
                            //arLne.push(value.valueCoding.code)
                            let lne = arLne.join('\t')
                            console.log(lne)
                            ar.push(lne)
                        })
                    }

                    //ar.push("===========")
                //}
                //return ar
                return ar  // .join('\r\n')


            },
            "makeExportOneItem" : function(arExport,item,Q,section,group,hashAllItems) {
                //make an array with coding answerOptions for the item
                let extAoTerm = "http://clinfhir.com/fhir/StructureDefinition/cs-term"
                let meta = formsSvc.getMetaInfoForItem(item)

                //create the obigation and usage nnotes first
                let vo = makeObligation(item,section,group,meta)

                let usageNotes = vo.usageNotes
                let obligation = vo.obligation

//Section	Group	Item	linkId	qCode	qDisplay	qSystem	Extract type	DataType	Description	Obligation	Condition	Guide for use	Repeats	Hidden	Exclude	ValueSet	oDisplay	oCode	oTerm	oSystem
                /*
               "Section",
               "Group",
               "Item",
               "linkId",
               "qCode",
               "qDisplay",
               "qSystem",
               "Extract type",
               "DataType",
               "Description",
               "Obligation",
               "Condition",
               "Guide for use","
               Repeats",
               "Hidden",
               "Exclude","
               ValueSet",
               "oDisplay",
               oCode",
               "oTerm",
               oSystem"]

                * */

/*
                Section
                Group
                Item
                link Id
                Text                ???
                Question code
                Question display
                Question system
                FHIR resource type
                Data type
                Options             ???
                Description
                Obligation
                Guide for use
                 Repeatable
                Value set


                Display*
                Code*
                Term*
                System*
                    */

                //first make the summary for the item
                let ar = []
                ar.push(section.text)           //section
                if (group) {                    //group
                    ar.push(group.text)
                } else {
                    ar.push("")
                }
                ar.push(item.text)              //item
                ar.push(item.linkId)            //linkId
                if (item.code) {
                    let code = item.code[0]
                    ar.push(code.code || "")
                    ar.push(code.display || "")

                    ar.push(code.system || "")
                } else {
                    ar.push("")             //code
                    ar.push("")             //display

                    ar.push("")             //system
                }

                let extract = ""  //what is extracted from this item (if any)
                if (meta.extraction) {
                    if (meta.extraction.extractObservation) {
                        extract = "Observation"
                    } else if (meta.extraction.type) {
                        extract = meta.extraction.type
                    }
                }
                if (item.definition) {
                    extract = item.definition
                }


                ar.push(extract)                 //extract resource type




                ar.push(item.type)          //datatype
                ar.push(cleanText(meta.description) || "")
                ar.push(cleanText(obligation) )                //obligation
                ar.push(getConditionalNote(item))                                     //condition
                ar.push(cleanText(usageNotes) )                //guide for use

                if (item.repeats) {
                    ar.push("Yes")
                } else {
                    ar.push("No")
                }
                if (meta.hidden) {
                    ar.push("")                                     //hidden
                } else {
                    ar.push("hidden")
                }

                ar.push("")                                     //exclude
                ar.push(item.answerValueSet || "")

                //now add the as a line to the export file
                arExport.push(ar.join('\t'))

                //now for any options - adding code, display, term,system
                if (item.answerOption) {
                    item.answerOption.forEach(function (ao) {
                        //let arStart = angular.copy(ar)
                        let arStart = Array(ar.length).fill('');

                        let coding = ao.valueCoding
                        arStart.push(coding.display || "")
                        arStart.push(coding.code || "")


                        let arExt = formsSvc.findExtension(ao,extAoTerm)
                        if (arExt.length > 0) {
                            let term = arExt[0].valueString
                            arStart.push(term)
                        } else {
                            arStart.push("")
                        }

                        arStart.push(coding.system || "")
                        arExport.push(arStart.join('\t'))
                    })
                }



                function getConditionalNote(item) {
                    let note = ""
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {

                            let sourceItem = hashAllItems[ew.question]      //the item this one is conditional on
                            if (sourceItem) {

                                //todo need to check for other conditional operators...


                                note += "Use when '" + sourceItem.text + "' is equal to "


                                if (ew.answerCoding) {
                                    note += ew.answerCoding.code
                                    if (ew.answerCoding.display) {
                                        note += ` (${ew.answerCoding.display})`
                                    }
                                } else if (ew.answerString) {
                                    note +=  sourceItem.text + " = " + ew.answerString
                                } else if (ew.answerBoolean) {
                                    note += " true"
                                } else {
                                    note += " an unknown value"
                                }

                            } else {
                                note += "No item with a linkId of '"+ew.question + "' was found."
                            }
                        })

                    }
                    return note


                }


                function makeObligation(item,section,group,meta) {
                    let obligation = "Optional"
                    let usageNotes = meta.usageNotes || ""
                    if (item.enableWhen) {
                        obligation = "Conditional"
                        usageNotes += getConditionalNote(item)
                    }
                    //if there is a parent parameter, then this item is a member of a group. It will be conditional if the group is..
                    if (group) {
                        if (group.enableWhen) {
                            obligation = "Conditional"
                            usageNotes += getConditionalNote(parent)  //the conditional details are on the parent...
                        }
                    }

                    if (item.required) {
                        obligation = "Mandatory"
                    }

                    return {obligation : obligation, usageNotes : usageNotes}

                }


                function cleanText(txt) {
                    if (txt) {
                        txt = txt.replace(/(\r\n|\n|\r)/gm, " ");

                    }
                    return txt
                }

/*
                //let ar = []
                if (item.answerOption && item.type == 'choice') {
                    ar.push(["Q",Q.name].join('\t'))
                    ar.push(["linkId",item.linkId].join('\t'))
                    ar.push(["text",item.text].join('\t'))
                    ar.push(["description",item.description].join('\t'))
                    //ar.push(item.description)
                    ar.push("")
                    ar.push("Display (edit)\tSystem (edit)\tCode (edit)\tCurrent system (leave)\tCurrent code (leave)")
                    item.answerOption.forEach(function (value) {
                        let arLne = []

                        arLne.push(value.valueCoding.display)
                        arLne.push(value.valueCoding.system)
                        arLne.push(value.valueCoding.code)
                        arLne.push(value.valueCoding.system)
                        arLne.push(value.valueCoding.code)
                        let lne = arLne.join('\t')
                        console.log(lne)
                        ar.push(lne)
                    })
                    //ar.push("===========")
                }
                //return ar
                return ar  // .join('\r\n')

*/
            }

        }
    })