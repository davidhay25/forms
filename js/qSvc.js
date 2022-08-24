angular.module("formsApp")
    //editing questionnaire
    .service('qSvc', function(formsSvc) {

        return {

            updateAfterChoice : function(Q,lstEW) {
                //after an item has been converted to a choice, updates any dependencies
                //may alsa be useful later on (with some changes) when codes are updated and we need to do the same...

                Q.item.forEach(function (section) {
                    checkItem(section)
                    if (section.item) {
                        section.item.forEach(function (child) {
                            checkItem(child)
                            if (child.item) {
                                child.item.forEach(function (grandChild) {
                                    checkItem(grandChild)
                                })
                            }

                        })
                    }

                })

                function checkItem(item) {
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ewToCheck) {   //check all the enableWhens
                            lstEW.forEach(function (ew) {
                                if (ewToCheck.question == ew.question) {
                                    //this item has an enebleWhen reference to one that has been converted into a choice
                                    ewToCheck.question = ew.newQuestion //change to point to the generated question
                                    ewToCheck.answerCoding = ew.answerCoding.valueCoding
                                    //remove the previous possible answers. There are others, but the app never supported them
                                    delete ewToCheck.answerBoolean
                                    delete ewToCheck.answerString
                                    delete ewToCheck.answerInteger
                                }
                            })

                        })
                    }
                }

            },

            fixDependencies : function(Q,arMapping) {
                //adjust dependencies based on mapping array (produced by editCodes = but could be editItem)

                if (arMapping.length < 1) {
                    return
                }

                //create a hash on the original values
                let hash = {}
                arMapping.forEach(function (map) {

                    let key = map.original.valueCoding.system + "|" + map.original.valueCoding.code
                    hash[key] = map.mapped
                })

                //now go through the Q looking for dependencies that match this key and update them

                if (Q.item) {
                    Q.item.forEach(function (section){
                        checkDependency(section)
                        if (section.item) {
                            section.item.forEach( function(child){
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        checkDependency(grandchild)
                                    })
                                } else {
                                    checkDependency(child)
                                }
                            })
                        }
                    })
                }

                return Q

                function checkDependency(item) {
                    if (item.enableWhen) {

                        item.enableWhen.forEach(function (dep) {

                            if (dep.answerCoding) {
                                let key = dep.answerCoding.system + "|" + dep.answerCoding.code
                                if (hash[key]) {
                                    //this is a dependency that may needs to be changed

                                    console.log(hash[key])
                                    dep.answerCoding.system = hash[key].valueCoding.system
                                    dep.answerCoding.code = hash[key].valueCoding.code

                                }

                            }




                        })
                    }
                }



            },

            search : function(Q,text) {
                //locate all itens where the text or any answeroption element have that text

                text = text.toLowerCase()
                let matchingItems = []
                if (Q.item) {
                    Q.item.forEach(function (section){

                        checkIfTextPresent(section,text,section)
                        if (section.item) {
                            section.item.forEach( function(child){
                                checkIfTextPresent(child,text,section)
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        checkIfTextPresent(grandchild,text,section,child)
                                    })
                                } else {
                                    //checkIfTextPresent(child,text,section)
                                }
                            })
                        }
                    })
                }
                return matchingItems

                function checkIfTextPresent(item,text,section,group) {
                    if (item.text.toLowerCase().indexOf(text) > -1 ) {
                        matchingItems.push({item:item,match:'Text element',section:section,group:group})
                    } else if (item.answerOption) {
                        let found = false
                        item.answerOption.forEach(function (ao) {
                            let vc = ao.valueCoding
                            if (vc && vc.display && vc.display.toLowerCase().indexOf(text) > -1) {
                                found = true
                            }



                        })
                        if (found) {
                            matchingItems.push({item:item,match:"Answer option",section:section,group:group})
                        }
                    }

                }


            },

            auditDependencies : function(Q,hash) {
                //check that the all the sources

                let arResult = []

                //construct a list of all items with a dependency
                let arDependencies = []

                if (Q.item) {
                    Q.item.forEach(function (section){
                        checkDependency(section)
                        if (section.item) {
                            section.item.forEach( function(child){
                                if (child.item) {
                                    child.item.forEach(function (grandchild) {
                                        checkDependency(grandchild)
                                    })
                                } else {
                                    checkDependency(child)
                                }
                            })
                        }
                    })
                }

                return arResult //arDependencies

                function checkDependency(item) {
                    if (item.enableWhen) {

                        item.enableWhen.forEach(function (dep) {
                            if (! hash[dep.question]) {
                                let err = "Controlling item not found"
                                let entry = {source:item.linkId,target:dep.question, ok:false,dep:dep,err:err}
                                entry.sourceText = item.text
                                arResult.push(entry)
                            } else {
                                let OK = true
                                let controllerText = hash[dep.question].item.text
                                //if this is a coding, then is the target in the dependency still present
                                let err
                                if (dep.answerCoding) {
                                    let depItem = hash[dep.question].item       //the item this one is dependant on...

                                    if (depItem.answerOption) {
                                        //locate the specific answew
                                        let found = false
                                        depItem.answerOption.forEach(function (ao) {
                                            let vc = ao.valueCoding
                                            if ((vc.system == dep.answerCoding.system) && (vc.code == dep.answerCoding.code)) {
                                                found = true
                                            }

                                        })

                                        if (! found) {
                                            err = "This value is not in the set of answers"
                                            OK = false
                                        }

                                    } else {
                                        //there are no answerOptions
                                        err = "There are no answerOptions in the dependency"
                                        OK = false
                                    }

                                }


                                let entry = {source:item.linkId,target:dep.question, ok:OK,dep:dep,err:err}
                                entry.sourceText = item.text
                                entry.controllerText = controllerText
                                arResult.push(entry)
                            }
                        })
                        arDependencies = arDependencies.concat(item.enableWhen)
                    }
                }

            },


            dnd : function(Q,sourceItem,targetItem) {
                //invoked after dnd drop. Assume the caller has checked this is a valid move

                //locate the parent of the source and remove it

                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]
                    if (section.item) {
                        for (var childIndex = 0; childIndex < section.item.length;childIndex ++) {
                            let child = section.item[childIndex]
                            if (child.linkId == sourceItem.linkId) {
                                //this section item is the parent of the source. remove it
                                section.item.splice(childIndex,1)
                                break
                            }
                            if (child.item) {   //might be coming out of a group...
                                for (var grandchildIndex = 0; grandchildIndex < child.item.length;grandchildIndex ++) {
                                    let grandchild = child.item[grandchildIndex]
                                    if (grandchild.linkId == sourceItem.linkId) {
                                        //this section item is the parent of the source. remove it
                                        child.item.splice(grandchildIndex,1)
                                        break
                                    }
                                }
                            }

                        }
                    }
                }

                //locate the target (assumed to be a group) and add the source to the .item array
                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]

                    if (section.linkId == targetItem.linkId) {
                        //dragged on to a section
                        section.item = section.item || []
                        section.item.push(sourceItem)
                        console.log('insert section')
                        break
                    }

                    if (section.item) {
                        for (var childIndex = 0; childIndex < section.item.length;childIndex ++) {
                            let child = section.item[childIndex]
                            if (child.linkId == targetItem.linkId && child.type == 'group') {
                                //dropping on to a group. Checking the type is probably not necessary...
                                child.item = child.item || []
                                child.item.push(sourceItem)
                                console.log('insert chile')
                                break
                            }


                        }
                    }
                }





            },


            checkDependencyTargets : function(Q,arSection){
                if (! arSection) {
                    return []
                }
                //check that any dependency targets in the section (to be imported) are in the Q or the section itself
                //used when importing a section to make sure it doesn't reference anything outside of the section
                let hashAllLinkIds = {}         //hash of all linkIds in Q & sectiond
                let hashAllSourceLinkIds = {}   //hash of all the sources in any dependencies
                //add all the linkIds in the Q to the hash
                if (Q.item) {
                    Q.item.forEach(function (section) {
                        getAllLinkIdsInSection(section)
                    })
                }
                //now add the linkids from the sections to import

                arSection.forEach(function (section) {
                    getAllLinkIdsInSection(section)
                })

                //now we have the hash of all items in the Q and the has of all dependency sources in the s
                //hashAllSourceLinkIds is keyed by the source linkid - ie it contains all the items that have a dependency on this one
                let result = []
                Object.key(hashAllSourceLinkIds).forEach(function (linkId) {
                    if (!hashAllLinkIds[linkId]) {
                        //this is a situation where there is an item with a dependency on a non existant item
                        let source = hashAllSourceLinkIds[linkId]   //this will be an array of the items with a dependence on this one
                        source.forEach(function (targ) {
                            result.push({target:targ,sourceId:linkId})
                        })
                    }
                })
                return result



                function getDependencySources(item) {
                    //update the hash of dependency sources
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            //want a list of all items that have a dependency on this question
                            hashAllSourceLinkIds[ew.question] = hashAllSourceLinkIds[ew.question] || []
                            hashAllSourceLinkIds[ew.question].push(item)
                        })
                    }
                }

                //go through the section and pull put all the linkIds
                function getAllLinkIdsInSection(section) {
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.item) {
                                child.item.forEach(function (grandChild) {
                                    hashAllLinkIds[grandChild.linkId] = true
                                })

                            } else {
                                hashAllLinkIds[child.linkId] = true
                            }
                        })
                    }

                }

            },

            checkUniqueLinkId : function (Q,arSection) {
                //check that linkId's are unique in a Q. If a section is passed in, include that in the check (when importing sections)
                let hash = {}
                let duplicates = ""         //will contain any duplicates found

                checkBranch(Q)
                if (arSection) {
                    arSection.forEach(function (section) {
                        checkBranch(section)
                    })
                }

                return duplicates       //updated by check branch

                function checkBranch(branch) {
                    if (branch.item) {
                        branch.item.forEach(function (section){
                            checkLinkId(section.linkId)
                            if (section.item) {
                                section.item.forEach( function(child){
                                    checkLinkId(child.linkId)
                                    if (child.item) {
                                        child.item.forEach(function (grandchild) {
                                            checkLinkId(grandchild.linkId)
                                        })
                                    }
                                })
                            }

                        })
                    }
                }

                function checkLinkId(linkId) {
                    if (hash[linkId]) {
                        duplicates += (linkId) + " "
                    } else {
                        hash[linkId] = true
                    }

                }

            },

            updatePrefix : function(Q) {
                //make them sequential within a section
                if (Q.item) {
                    Q.item.forEach(function (section, inxSection){

                        let prefix = 1
                        section.prefix = inxSection +1

                        if (section.item) {
                            section.item.forEach( function(child, inxChild){

                                child.prefix = prefix ++ //inxChild +1
                                if (child.item) {
                                    child.item.forEach(function (grandchild,inxGrandChild) {
                                        grandchild.prefix = prefix ++ //inxGrandChild +1
                                    })
                                }
                            })
                        }



                    })
                }

            },

            editItem : function(Q,item,originalLinkId) {
                //edit an item - replace the existing item with the updated one called after the item editor

                //if the originalLinkId is passed in, then the linkId was changed (we assume that any dependencies were checked)
                //in this case we need to search based on the original linkId
                let linkId = originalLinkId || item.linkId

                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]
                    if (section.linkId == linkId) {
                        //section is being removed
                        Q.item.splice(sectionIndex,1,item)
                        break
                    } else {
                        if (section.item) {
                            for (var childIndex =0; childIndex < section.item.length;childIndex ++) {
                                let child = section.item[childIndex]
                                if (child.linkId == linkId) {
                                    // a child off the section is being removed
                                    section.item.splice(childIndex,1,item)
                                    break
                                } else {
                                    if (child.item) {
                                        for (var grandchildIndex = 0; grandchildIndex < child.item.length; grandchildIndex++) {
                                            let grandchild = child.item[grandchildIndex]
                                            if (grandchild.linkId == linkId) {
                                                //a grandchild is being removed
                                                child.item.splice(grandchildIndex,1,item)
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }

                    }
                }
                return Q
            },
            addItem : function(Q,parentLinkId,item) {
                //add an item to the specified parent. either an item to a section, or an item to a group

                //iterate through the Q. When the parent is found, add the new item
                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {
                    //is the section the parent?
                    let section = Q.item[sectionIndex]
                    if (section.linkId == parentLinkId) {
                        //a child being added to a section
                        section.item = section.item || []
                        section.item.push(item)

                        break
                    } else {
                        //is a child off a section the parent?
                        if (section.item) {
                            for (var childIndex = 0; childIndex < section.item.length;childIndex ++) {
                                let child = section.item[childIndex]
                                if (child.linkId == parentLinkId) {
                                    // a grandchild added to a child
                                    child.item = child.item || []
                                    child.item.push(item)
                                    child.type = 'group'
                                    break
                                }
                            }
                        }

                    }
                }
                return Q
            },

            removeItem : function(Q,linkId) {
                for (var sectionIndex = 0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]
                    if (section.linkId == linkId) {
                        //section is being removed
                        Q.item.splice(sectionIndex,1)
                        break
                    } else {
                        if (section.item) {
                            for (var childIndex = 0; childIndex < section.item.length; childIndex++) {
                                let child = section.item[childIndex]
                                if (child.linkId == linkId) {
                                    // a child off the section is being removed
                                    section.item.splice(childIndex, 1)
                                    break
                                } else {
                                    if (child.item) {
                                        for (var grandchildIndex = 0; grandchildIndex < child.item.length; grandchildIndex++) {
                                            let grandchild = child.item[grandchildIndex]
                                            if (grandchild.linkId == linkId) {
                                                //a grandchild is being removed
                                                child.item.splice(grandchildIndex, 1)
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return Q

            },

            moveItem : function(Q,dirn,linkId) {
                for (var sectionIndex =0; sectionIndex < Q.item.length;sectionIndex ++) {
                    let section = Q.item[sectionIndex]
                    if (section.linkId == linkId) {

                        if (dirn == 'up' && sectionIndex > -1) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex-1,0,ar[0])
                        }

                        if (dirn == 'dn' && sectionIndex < Q.item.length) {
                            let ar = Q.item.splice(sectionIndex,1)
                            Q.item.splice(sectionIndex+1,0,ar[0])
                        }
                        break

                    } else {
                        //now check the section children
                        if (section.item) {
                            for (var childIndex =0; childIndex < section.item.length;childIndex ++) {
                                let child = section.item[childIndex]
                                if (child.linkId == linkId) {
                                    console.log('found',childIndex)

                                    if (dirn == 'up' && childIndex > 0) {
                                        let ar = section.item.splice(childIndex,1)
                                        section.item.splice(childIndex-1,0,ar[0])

                                    }
                                    if (dirn == 'dn' && childIndex < section.item.length) {
                                        let ar = section.item.splice(childIndex,1)
                                        section.item.splice(childIndex+1,0,ar[0])

                                    }
                                    break
                                } else {
                                    //grandchildren
                                    if (child.item) {
                                        for (var grandchildIndex = 0; grandchildIndex < child.item.length;grandchildIndex ++) {
                                            let grandchild = child.item[grandchildIndex]
                                            if (grandchild.linkId == linkId) {
                                                if (dirn == 'up' && grandchildIndex > 0) {
                                                    let ar = child.item.splice(grandchildIndex,1)
                                                    child.item.splice(grandchildIndex-1,0,ar[0])

                                                }
                                                if (dirn == 'dn' && grandchildIndex < section.item.length) {
                                                    let ar = child.item.splice(grandchildIndex,1)
                                                    child.item.splice(grandchildIndex+1,0,ar[0])

                                                }
                                                break
                                            }


                                        }
                                    }
                                }

                            }
                        }


                    }


                }
                return Q


            },

        }

    })