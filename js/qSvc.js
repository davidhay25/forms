angular.module("formsApp")
    //editing questionnaire
    .service('qSvc', function($q,$http,$filter,moment) {



        return {
            //fin

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
            },

            editItem : function(Q,item) {
                //edit an item
                let linkId = item.linkId

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