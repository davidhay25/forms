angular.module("formsApp")
    //editing questionnaire
    .service('qSvc', function($q,$http,$filter,moment) {

        return {
            addItem : function(Q,parentLinkId,item) {
                //add an item to the specified parent

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
                                break
                            }
                            /*
                            else {
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
                            */
                        }
                    }
                }
                return Q
            }
        }

    })