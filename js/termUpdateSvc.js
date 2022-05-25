angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('termUpdateSvc', function() {


        return {
            makeItemCodeList : function(Q) {
                //create a list of all the items in a Q for presenting in an editable table
                let ar = []
                Q.item.forEach(function (section) {
                    let sect = {section:section,items:[]}
                    ar.push(sect)
                    if (section.item) {
                        section.item.forEach(function (child) {
                            if (child.type == 'group' && child.item) {
                                child.item.forEach(function (grandChild) {
                                    sect.items.push({section:section,group:child,item:grandChild})

                                })
                            } else {
                                //this is a data item
                                sect.items.push({section:section,item:child})
                            }

                        })
                    }
                })
                return ar
            }
        }
    })