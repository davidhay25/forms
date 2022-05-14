angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('terminologySvc', function($q,$http,formsSvc) {

        termServer = "https://r4.ontoserver.csiro.au/fhir/"
        let hashVS = {}

        return {

            makeTermServerSummary : function(arVS){
                //let deferred = $q.defer()
                //take in an array of VS URL's, (from getValueSetsForQ) and retrieve the matching ValueSets (unexpanded) from both termserver and local server
                //as there are http calls, the array will be incrementally updated as calls complete
                let localServer = "/ds/fhir/"
                arVS.forEach(function (vsItem) {
                    let url = vsItem.vsUrl
                    getVS(url,localServer).then(
                        function (vs) {
                            vsItem.local = vs
                        }
                    )

                    getVS(url,termServer).then(
                        function (vs) {
                            vsItem.remote = vs
                        }
                    )

                })

                function getVS(url,svr) {
                    //retrieve a VS
                    let deferred = $q.defer()
                    let qry = svr + "ValueSet?url=" + url + "&_summary=false"
                    $http.get(qry).then(
                        function(data) {
                            if (data.data && data.data.entry && data.data.entry.length > 0) {  //todo - startegy for > 1
                                let vs = data.data.entry[0].resource
                                deferred.resolve(vs)
                            }
                        }, function(err) {
                            console.log(err)
                            deferred.resolve(null)
                        }
                    )



                    return deferred.promise
                }


            },

            getTerminologyServer : function() {
                return termServer
            },

            getValueSetsForQ : function(Q) {
                let ar = []
                if (Q.item) {
                    Q.item.forEach(function (sectionItem) {

                        if (sectionItem.item) {

                            sectionItem.item.forEach(function (childItem) {
                                if (childItem.answerValueSet) {
                                    ar.push({vsUrl:childItem.answerValueSet,linkId:childItem.linkId})
                                }

                                if (childItem.item) {
                                    childItem.item.forEach(function (grandchildItem) {
                                        if (grandchildItem.answerValueSet) {
                                            ar.push({vsUrl:grandchildItem.answerValueSet,linkId:grandchildItem.linkId})
                                        }
                                    })
                                }
                            })
                        }

                    })
                }
                return ar
            },

            setValueSetHash: function (allQ) {
                //retrieve all ValueSets from all Q
                //let hashVS = {}
                allQ.forEach(function (Q) {
                    if (Q.item) {
                        Q.item.forEach(function (sectionItem) {

                            if (sectionItem.item) {

                                sectionItem.item.forEach(function (childItem) {
                                    addToHashVS(hashVS,Q,childItem,sectionItem)
                                    if (childItem.item) {
                                        childItem.item.forEach(function (grandchildItem) {
                                            addToHashVS(hashVS,Q,grandchildItem,sectionItem)
                                        })
                                    }
                                })
                            }

                        })
                    }

                })

                return hashVS

                function addToHashVS(hashVS,Q,item,sectionItem) {
                    //add to the has if there is an answerValueSet
                    if (item.answerValueSet) {
                        hashVS[item.answerValueSet] = hashVS[item.answerValueSet] || []
                        let cloneQ = angular.copy(Q)
                        delete cloneQ.item
                        let entry = {Q:cloneQ,item:item,section:sectionItem}
                        entry.meta = formsSvc.getMetaInfoForItem(item)
                        hashVS[item.answerValueSet].push(entry)
                    }

                }


            }
        }
    })