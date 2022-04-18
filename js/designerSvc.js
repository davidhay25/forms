angular.module("formsApp")

    .service('designerSvc', function(formsSvc) {

        return {
            //generate the treedata for a LM
            //the parent of an item:
            // is the
            makeLMObjectDEP : function(Q) {
                //note similarities with exportSvc
                let hashAllItems = formsSvc.makeHashAllItems(Q)
                let model = []
                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {
                        let sectionMeta = formsSvc.getMetaInfoForItem(sectionItem)
                        let sectionRow = {type:"section","display": sectionItem.text,description : sectionMeta.description}
                        let note = getConditionalNote(sectionItem,hashAllItems)
                        sectionRow.note = note
                        processItem(sectionItem,sectionRow)
                        model.push(sectionRow)

                        if (sectionItem.item) {
                            sectionItem.item.forEach(function (childItem) {
                                let childMeta = formsSvc.getMetaInfoForItem(childItem)
                                let childRow = {type:"child",display:childItem.text,description:childMeta.description}
                                let note = getConditionalNote(childItem,hashAllItems)
                                childRow.note = note

                                processItem(childItem,childRow)
                                model.push(childRow)
                                
                                if (childItem.item) {
                                    childItem.item.forEach(function (grandchildItem) {
                                        let grandchildMeta = formsSvc.getMetaInfoForItem(grandchildItem)
                                        let grandchildRow = {type:"grandchild",display:grandchildItem.text,description:grandchildMeta.description}
                                        let note = getConditionalNote(grandchildItem,hashAllItems)
                                        grandchildRow.note = note
                                        processItem(sectionItem,sectionRow)
                                        model.push(grandchildRow)
                                    })
                                }
                                
                            })
                        }

                    })
                }


                return model



                function processItem(item,row) {


                    //add the data domaon
                    row.dd = ""

                    if (item.answerOption && (item.type == 'choice' || item.type== 'open-choice')) {

                        item.answerOption.forEach(function (ao) {

                            row.dd += ao.valueCoding.display + "; "
                        })

                    }



                }

                //create a note based on any conditionals found in the item
                function getConditionalNote(item,hashAllItems) {
                    let note = ""
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            let source = hashAllItems[ew.question]
                            if (source) {
                                note += "Displayed when the value of '" + source.item.text + "' is equal to "
                                if (ew.answerCoding) {
                                    note += ew.answerCoding.code
                                }
                                if (ew.answerBoolean) {
                                    note += ew.answerBoolean
                                }

                            } else {
                                note += "No item with a linkId of '"+ew.question + "' was found."
                            }
                        })

                    }
                    return note
                    
                    
                }


            }
        }

    })