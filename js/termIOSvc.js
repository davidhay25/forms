angular.module("formsApp")

    .service('termIOSvc', function(formsSvc) {

        return {

            "updateFromQFile" : function(){

            },
            "makeExportQ" : function(Q) {
                //make a term export
                let that = this
                let arAllExport = []
                Q.item.forEach(function (section) {
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.type == 'group' && child.item) {
                                child.item.forEach(function (grandChild) {
                                    let ar = that.makeExportOneItem(grandChild,Q,section)
                                    if (ar.length > 0) {
                                        ar.push("")
                                        arAllExport = arAllExport.concat(ar)
                                    }

                                })
                            } else {
                                //this is a data item
                                let ar = that.makeExportOneItem(child,Q,section)
                                if (ar.length > 0) {
                                    ar.push("")
                                    arAllExport = arAllExport.concat(ar)
                                }
                                //arAllExport = arAllExport.concat(that.makeExportOneItem(child))
                            }

                        })
                    }
                })

                return arAllExport
            },

            "UpdateFromFile" : function (item,file,Q) {
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
            "makeExportOneItem" : function(item,Q,section) {
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
            "makeExportOneItemOLD" : function(item,Q) {
                //make an array with coding answerOptions for the item
                let ar = []
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


            }

        }
    })