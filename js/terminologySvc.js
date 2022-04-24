angular.module("formsApp")
    //primarily building logical model of act-now data
    .service('terminologySvc', function($q,$http,formsSvc) {

        termServer = "https://r4.ontoserver.csiro.au/fhir/"
        let hashVS = {}

        return {
            getTerminologyServer : function() {
                return termServer
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