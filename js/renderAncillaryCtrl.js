//render an ancillary test in a specific way.
//assume that the group has been created by the wizard...

angular.module("formsApp")
    .controller('renderAncillaryCtrl',
        function ($scope,group) {

            $scope.input = {}
            $scope.group = group
            let baseLinkId = group.linkId   //the wizard uses the group linkid as the base for the others
            let resultsLinkId = baseLinkId + "-results"

            //assemble the primary list of options. These are the possible results, plus not done, inconclusive, fail
            $scope.input.firstListOptions = []    //all the elements in the first list. The are Coding DT...
            $scope.input.reasonsNotPerformed = []
            $scope.input.reasonsInconclusive = []
            $scope.input.reasonsFailed = []

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
                    }


                })
            }




        }
    )