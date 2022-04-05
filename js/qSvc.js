angular.module("formsApp")
    //editing questionnaire
    .service('qSvc', function($q,$http,$filter,moment) {

        return {
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
                        //Q.item.splice(sectionIndex,1)
                        break
                    } else {
                        //is a child off a section the parent?

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
                        for (var childIndex =0; childIndex < section.item.length;childIndex ++) {
                            let child = section.item[childIndex]
                            if (child.linkId == linkId) {
                                // a child off the section is being removed
                                section.item.splice(childIndex,1)
                                break
                            } else {
                                if (child.item) {
                                    for (var grandchildIndex = 0; grandchildIndex < child.item.length; grandchildIndex++) {
                                        let grandchild = child.item[grandchildIndex]
                                        if (grandchild.linkId == linkId) {
                                            //a grandchild is being removed
                                            child.item.splice(grandchildIndex,1)
                                            break
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
                return Q


            },

        }

    })