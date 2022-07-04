angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('analyticsSvc', function($q,$http,formsSvc) {

        //? do really need both
        let arAllItems = []    // flattened list of all items {item: sectionId: groupId: }
        let hashAllItems = {}    //hash of item keyed by Q.url+item.linkId
        let hashAllQ = {}       //hash of Q metadata keyed by url

        return {

            findItemsWithText : function(searchText) {
                //find all items that contain the text
                let srch = searchText.toLowerCase()
                let ar = []
                let hash = {}
                Object.keys(hashAllItems).forEach(function (key) {  //key is Q.url | linkId
                    let thing = hashAllItems[key]  // {item: sectionId: groupId: }
                    let text = thing.item.text
                    if (text) {
                        let lc = text.toLowerCase()
                        if (lc.indexOf(srch) > -1) {


                            //this is a match
                            let ar1 = key.split('|')
                            let url = ar1[0]        //q.url
                            thing.Q = hashAllQ[url]

                            let sectionKey = url + "|" + thing.sectionId
                            let t =  hashAllItems[sectionKey]
                            if (t) {
                                thing.section =t.item
                            }

                            if (thing.groupId) {
                                let groupKey = url + "|" + thing.groupId
                                let tt =  hashAllItems[groupKey]
                                if (tt) {
                                    thing.group =tt.item
                                }
                            }



                            ar.push(thing)
                           // hash[url] = hash[url] || []
                           // hash[url].push(thing)
                        }

                    }

                })
                return ar



            },
            makeAllItemsList: function () {
                //construct a hash containing all items from all Qs as basis cor analytics...
                let deferred = $q.defer()
                //let arAllItems = []    // flattened list of all items {item: sectionId: groupId: }
                //let hashAllItems = {}    //hash of item keyed by Q.url+item.linkId

                let qry = "/ds/fhir/Questionnaire"
                let config = {headers:{Authorization:'dhay'}}
                $http.get(qry,config).then(
                    function(data) {
                        let bundle = data.data
                        bundle.entry.forEach(function (entry) {
                            let Q = entry.resource
                            let clone = angular.copy(Q)
                            delete clone.item
                            hashAllQ[Q.url] = clone

                            if (Q.item && ! formsSvc.QhasFolderTag(Q,'test')) {
                                //exclude test Q
                                Q.item.forEach(function (section) {

                                    //add the section to the hash
                                    let key = Q.url + "|" + section.linkId
                                    hashAllItems[key] = {item:section}


                                    if (section.item) {
                                        //the section has items



                                        section.item.forEach(function (child) {

                                            let key = Q.url + "|" + child.linkId
                                            hashAllItems[key] = {item:child,sectionId:section.linkId}

                                            if (child.item) {
                                                //this is a group

                                              //  let key = Q.url + "|" + child.linkId
                                               // hashAllItems[key] = {item:child}

                                                child.item.forEach(function (grandChild) {
                                                    //arAllItems.push({item:grandChild,sectionId:section.linkId,groupId:child.linkId})
                                                    let key = Q.url + "|" + grandChild.linkId
                                                    hashAllItems[key] = {item:grandChild,sectionId:section.linkId,groupId:child.linkId}
                                                })
                                            } else {
                                                //this is a leaf

                                                //arAllItems.push({item:child.item,sectionId:section.linkId})
                                             //   let key = Q.url + "|" + child.linkId
                                              //  hashAllItems[key] = {item:child,sectionId:section.linkId}
                                            }

                                        })
                                    }

                                })

                            }
                        })
                        deferred.resolve({arAllItems:arAllItems,hashAllItems:hashAllItems})
                    }
                )

                return deferred.promise
            }

        }
    }
)