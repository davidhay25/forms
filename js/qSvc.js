angular.module("formsApp")
    //editing questionnaire
    .service('qSvc', function(formsSvc) {

        return {



            setItemValue : function(sections,linkId,value,form,dt) {
                //set the answerOption in the template for that linkid
                if (! value) { return}

                sections.forEach(function (section) {
                    section.rows.forEach(function (row) {

                        ['col1','col2','col3','col4'].forEach(function (col) {
                            if (row[col]) {
                                row[col].forEach(function (cell) {
                                    checkItem(cell)
                                })
                            }
                        })



                    })

                })


                function checkItem(cell) {
                    if (cell.item.linkId == linkId) {

                        switch (dt) {
                            case 'Coding' :
                                //This is the item to change - set the value. Has to be the one from the template...
                                if (cell.item.answerOption) {
                                    cell.item.answerOption.forEach(function (ao) {
                                        if (ao.valueCoding && ao.valueCoding.code == value.code) {
                                            form[linkId] = ao
                                        }
                                    })
                                }
                                break

                            default :
                                form[linkId] = value
                                break

                        }
                    }
                }
                
            },

            makeDependencyGraph : function(audit,linkId){
                //make a graph of dependencies between items in the Q
                //uses the audit object created by auditDependencies()
                //audit.source is the one whode visibility is controlled by the target
                //the arrow should be from target -> source
                //if linkId is present, then only show items with a link (either way) to that one

                let arNodes = []    //
                let arEdges = []
                //create a hash of all the objects that are sources or targets
                let hashNodes = {}
/*
                //all items that are either a source or target of a dependency link
                audit.forEach(function (vo) {
                    if (linkId) {
                        //should this item be added to the list? Either if it is the item, or it references the item
                        if (vo.source == linkId || vo.target == linkId) {
                            hashNodes[vo.source] = hashNodes[vo.source] || {text: vo.sourceText}
                            hashNodes[vo.target] = hashNodes[vo.target] || {text: vo.controllerText}
                        }
                    } else {
                        //add both source & target
                        hashNodes[vo.source] = hashNodes[vo.source] || {text: vo.sourceText}
                        hashNodes[vo.target] = hashNodes[vo.target] || {text: vo.controllerText}
                    }

                })
*/
                //if linkId is present, then we want to include all nodes where there is a link - includng recirsive - to that node
                if (linkId) {
                    let itemsOfInterest = [linkId]
                    let lastLength = 1      //the last length of the list of nodes
                    let ctr = 0
                    do {
                        audit.forEach(function (vo) {
                            let question = vo.dep.question
                            if (vo.source == linkId || (itemsOfInterest.indexOf(question) > -1)|| (itemsOfInterest.indexOf(vo.source) > -1)) {
                                hashNodes[vo.source] = hashNodes[vo.source] || {text: vo.sourceText}
                                hashNodes[vo.target] = hashNodes[vo.target] || {text: vo.controllerText}
                                itemsOfInterest.push(vo.target)
                                itemsOfInterest.push(vo.source)
                                // hashNodes[vo.target] = hashNodes[vo.target] || {text: vo.controllerText}
                            }
                        })
                        ctr++
                    } while (
                        ctr < 5
                        )
                } else {
                    audit.forEach(function (vo) {
                        hashNodes[vo.source] = hashNodes[vo.source] || {text: vo.sourceText}
                        hashNodes[vo.target] = hashNodes[vo.target] || {text: vo.controllerText}
                    })
                }

                //make the nodes array
                Object.keys(hashNodes).forEach(function (key) {
                    let vo = hashNodes[key]
                    let node = {id: key, label: vo.text,
                        shape: 'box'}

                    if (linkId && (key == linkId)) {
                        node.color = 'red'
                    }
                    arNodes.push(node)
                })

                //now go through the dependencies - arrow is target -> source
                audit.forEach(function (vo) {
                    let linkText = ""

                    if (vo.dep && vo.dep.answerCoding && vo.dep.answerCoding.code) {
                        linkText = vo.dep.answerCoding.code
                    } else {
                        console.log("Missing answerCoding in linkid " + vo.target)
                    }

                    let edge = {id: 'e' + arEdges.length +1,
                        from: vo.target,
                        to: vo.source, // targetNode.id,
                        label: linkText,
                        arrows : {to:true}}

                    arEdges.push(edge)
                })

                let nodes;
                let edges;

                //nodes = new vis.DataSet(arNodes);
                nodes = new vis.DataSet(arNodes)
                edges = new vis.DataSet(arEdges);

                // provide the data in the vis format
                var data = {
                    nodes: nodes,
                    edges: edges
                };

                return {graphData : data,hashNodes:hashNodes};

            },

            cloneItem : function(item,parentLinkId,Q,hash) {
                //create a copy of this item and all its children

                //we only want an item to be cloned once...
                if (hash[item.linkId + '-c']) {
                    return "This item has already been cloned. (But you can clone the clone if you wish)"
                }

                let originalLinkId = item.linkId  //need this to know where to insert the cloned item...
                let hashLinkId = {}       //this is a hash of all the original linkId. Need to update the dependencies
                let newItem = angular.copy(item)
                hashLinkId[newItem.linkId] = true
                newItem.linkId = newItem.linkId + "-c" //update the linkIds - just add 'c' to the end (for copy)
                newItem.text += " (clone)"
                if (newItem.item) {
                    newItem.item.forEach(function (child) {
                        hashLinkId[child.linkId] = true
                        child.linkId = child.linkId + "-c"
                        if (child.item) {
                            child.item.forEach(function (grandChild) {
                                hashLinkId[grandChild.linkId] = true
                                grandChild.linkId = grandChild.linkId + "-c"
                            })
                        }
                    })
                }

                //now go through and update any depedencies to items in this item. We couldn't do it before as we needed the hashLinkId first
                updateDependencies(newItem,hashLinkId)
                if (newItem.item) {
                    newItem.item.forEach(function (child) {
                        updateDependencies(child,hashLinkId)
                        if (child.item) {
                            child.item.forEach(function (grandChild) {
                                updateDependencies(grandChild,hashLinkId)
                            })
                        }
                    })
                }


                //now insert into the Q
                if (parentLinkId == 'root') {
                    //the item being cloned is a section.
                    for (var i=0; i < Q.item.length; i++) {
                        if (Q.item[i].linkId == originalLinkId) {
                            Q.item.splice(i+1,0,newItem)
                            break
                        }
                    }

                } else {
                    //this could be a cloned group or item
                    for (var i=0; i < Q.item.length; i++) {
                        let section = Q.item[i]
                        if (section.item) {
                            for (var j=0; j < section.item.length; j++) {
                                let child = section.item[j]
                                if (child.linkId == originalLinkId) {
                                    //this is a group being cloned...
                                    section.item.splice(j+1,0,newItem)
                                    break
                                } else {
                                    //need to check any grand children
                                    if (child.item) {
                                        for (var k=0; k < child.item.length; k++) {
                                            let grandChild = child.item[k]
                                            if (grandChild.linkId == originalLinkId) {
                                                child.item.splice(k+1,0,newItem)
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }



                    }

                }

                return


                //if there are any 'enableWhen' enries, add the -c to the question. If the
                function updateDependencies(item,hashLinkId) {
                    if (item.enableWhen) {
                        item.enableWhen.forEach(function (ew) {
                            if (hashLinkId[ew.question]) {
                                ew.question += "-c"
                                console.log('update dep')
                            }

                        })
                    }
                }


                /*
                
                function getLinkIdSuffix(DEPlinkId) {
                    //find the next available suffix for this linkId. assume a pattern of '-n' for the suffix
                    let newSuffix = 0   //this will be the new suffix to use
                    Object.keys(hashAllItem).forEach(function (key) {
                        if (key.indexOf(linkId)) {
                            let ar = key.split('-')
                            if (ar.length == 0) {
                                //
                            } else {
                                let currentSuffix = ar[ar.length-1]
                                if (currentSuffix > newSuffix) {
                                    newSuffix = currentSuffix
                                }
                            }

                            //
                        }
                    })
                    return newSuffix +1
                    
                    */
                    
                    
                    

                
            },
            
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

            fixDependencies : function(Q,hash,linkId) {
                //adjust dependencies based on mapping array (produced by editCodes = but could be editItem)
                //hash (map of changes) is keyed on current source system|code and contains a valueCoding
                //eg {mysystem|mycode:{valueCoding:{system: code:}
                //linkId is the element that was changed
/*
                if (arMapping.length < 1) {
                    return
                }

                //create a hash on the original values
                let hash = {}
                arMapping.forEach(function (map) {

                    let key = map.original.valueCoding.system + "|" + map.original.valueCoding.code
                    hash[key] = map.mapped
                })
*/
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
                            //only look to make changes if the dependency is on the item that was changed...
                            if (dep.question == linkId) {
                                if (dep.answerCoding) {
                                    let key = dep.answerCoding.system + "|" + dep.answerCoding.code
                                    if (hash[key]) {
                                        //this is a dependency that may needs to be changed
                                        console.log(hash[key])
                                        dep.answerCoding.system = hash[key].valueCoding.system
                                        dep.answerCoding.code = hash[key].valueCoding.code
                                    }
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
                                //source = linkId of the item being controlled - sourceText is the text (slightly weird direction
                                //target = linkId of the item doing the controlling
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