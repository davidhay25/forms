angular.module("formsApp")
    .controller('frontPageCtrl',
        function ($scope,$http,formsSvc) {

            //todo - load the List resource - dashboard adds / removes from the list
         //   $scope.listQ = {resourceType:"List",status:'current',mode:'snapshot',entry:[]}
           // $scope.listQ.entry.push({item:{display:'Lung Cancer request',reference:'Questionnaire/QLungCancer'}})
          //  $scope.listQ.entry.push({item:{display:'Cervical Cancer request',reference:'Questionnaire/cf-1651534960400'}})


            formsSvc.getBallotList().then(
                function (list) {
                    $scope.ballotList = list
                    //load the questionnaires so the details can be displayed. Just add the Q to the item - it isn't being saved back so no-one will know...

                    if ($scope.ballotList.entry) {
                        $scope.ballotList.entry.forEach(function (item) {
                            let url = `/ds/fhir/${item.item.reference}`
                            $http.get(url).then(
                                function (data) {
                                    console.log(data.data)
                                    item.item.Q = data.data
                                }, function (err) {
                                    console.log(err)
                                }
                            )

                        })
                    }

                }
            )

            //let server =




/*
                //load all the disposition Observations for a Q
                $scope.loadDispositionsForQ = function(Q) {
                        delete $scope.dispositionsForQ
                        $scope.selectedQ = Q
                        formsSvc.loadDispositionsForQ(Q).then(
                            function(data) {
                                    $scope.dispositionsForQ = data

                            }
                        )
                }

                function loadAllQ() {
                        let url = "/ds/fhir/Questionnaire"
                        //let url = "/fm/fhir/Questionnaire"
                        $http.get(url).then(
                            function (data) {
                                    $scope.allQ = [];
                                    data.data.entry.forEach(function (entry){

                                            $scope.allQ.push(entry.resource)

                                    })
                                    //$scope.hashTerminology = terminologySvc.setValueSetHash($scope.allQ)
                                    // console.log($scope.hashTerminology)
                            }
                        )
                }

                loadAllQ()
*/
        })