angular.module("formsApp")
    .controller('viewFormReviewsCtrl',
        function ($scope,$http,formsSvc,$uibModal) {


                //load all the disposition Observations for a Q
                $scope.loadDispositionsForQ = function(Q) {
                        delete $scope.dispositionsForQ
                        $scope.selectedQ = Q
                        formsSvc.loadDispositionsForQ(Q).then(
                            function(data) {
                                    $scope.dispositionsForQ = data.result

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

        })