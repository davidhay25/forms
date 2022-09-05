//render an ancillary test in a specific way.
//assume that the group has been created by the wizard...

angular.module("formsApp")
    .controller('renderAncillaryCtrl',
        function ($scope,group,formsSvc) {

            $scope.input = {}
            $scope.input.additionalValue = {}
            $scope.group = group
            let baseLinkId = group.linkId   //the wizard uses the group linkid as the base for the others
            let resultsLinkId = baseLinkId + "-results"

            //assemble the primary list of options. These are the possible results, plus not done, inconclusive, fail
            $scope.input.firstListOptions = []    //all the elements in the first list. The are Coding DT...
            $scope.input.reasonsNotPerformed = []
            $scope.input.reasonsInconclusive = []
            $scope.input.reasonsFailed = []
            $scope.input.guidelines = []

            $scope.input.additionalItems = []       //additional items

            $scope.close = function (){
                //construct a vo with the value of specific linkIds
                //need to send back the overall status as well as any value
                //completed ( with result), not done, failed, inconclusive

                let vo = {baseLinkId : baseLinkId}
                vo.performed = {code:'performed'}
                vo.comment = $scope.input.comment


                if ($scope.input.firstList.code == 'notperformed') {
                    vo.performed = {code:"notperformed"}
                    vo.reasonNotPerformed = $scope.input.notperformed
                    vo.reasonNotPerformedOther = $scope.input.notperformedOther

                } else if ($scope.input.firstList.code == 'failed') {
                    vo.status = {code:'failed'}
                    vo.reasonFailed = $scope.input.failed
                    vo.reasonFailedOther = $scope.input.failedOther


                } else if ($scope.input.firstList.code == 'inconclusive') {
                    vo.status = {code:'completed'}
                    vo.results = $scope.input.firstList
                    vo.reasonInconclusive = $scope.input.inconclusive
                    vo.reasonInconclusiveOther = $scope.input.inconclusiveOther


                } else {
                    vo.status = {code:'completed'}
                    vo.results = $scope.input.firstList
                }

                //$scope.input.additionalItems.push({item:item,meta:meta})
                vo.additionalItems = []
                $scope.input.additionalItems.forEach(function (thing) {
                    let value = $scope.input.additionalValue[thing.item.linkId]

                    vo.additionalItems.push({linkId:thing.item.linkId,value:value,type:thing.item.type})
                })

                 //todo need to add logic & other states
              //  vo.result = $scope.input.firstList  //need to remove notperfromed & failed
               // vo[resultsLinkId] =




                $scope.$close(vo)
            }

            if (group.item) {
                group.item.forEach(function (item) {
                    switch (item.linkId) {

                        case baseLinkId + '-notPerformed-reason' :
                            //
                            item.answerOption.forEach(function (ao) {
                                $scope.input.reasonsNotPerformed.push(ao.valueCoding)
                            })
                            break

                        case baseLinkId + '-inconclusive-reason' :
                            //
                            item.answerOption.forEach(function (ao) {
                                $scope.input.reasonsInconclusive.push(ao.valueCoding)
                            })
                            break

                        case baseLinkId + '-failed-reason' :
                            //
                            item.answerOption.forEach(function (ao) {
                                $scope.input.reasonsFailed.push(ao.valueCoding)
                            })
                            break

                        case baseLinkId + '-guidelines' :
                            //
                            item.answerOption.forEach(function (ao) {
                                $scope.input.guidelines.push(ao.valueCoding)
                            })
                            break

                        case resultsLinkId :
                            item.answerOption.forEach(function (ao) {
                                $scope.input.firstListOptions.push(ao.valueCoding)
                            })


                            $scope.input.firstListOptions.push({display:"---------"})
                            $scope.input.firstListOptions.push({display:"Not performed",code:'notperformed'})
                            //$scope.input.firstListOptions.push({display:"Inconclusive",code:'inconclusive'})
                            $scope.input.firstListOptions.push({display:"Failed",code:'failed'})
                            $scope.input.firstList = $scope.input.firstListOptions[0]
                            break

                        default :
                            if (item.linkId.indexOf(baseLinkId+"-") == -1) {
                                //assume this is an additional item

                                let meta = formsSvc.getMetaInfoForItem(item)    //needed for description
                                $scope.input.additionalItems.push({item:item,meta:meta})


                            }
                            break
                    }


                })
            }




        }
    )