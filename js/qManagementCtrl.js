angular.module("formsApp")
    .controller('qManagementCtrl',
        function ($scope,$http,formsSvc) {

            $scope.qmSelectQ = function(Q) {
                $scope.qmSelectedQ = Q
            }


            //if run on local machine, will create a copy with the same url & other metadata
            $scope.downloadQ = function(Q) {
                if (confirm("Are you sure you want to download this Q: " + Q.name)) {
                    let clone = angular.copy(Q)
                    clone.id = 'copy-' + Q.id      //this means that if downloaded multiple times, it will replace any earlier ones
                    clone.url = Q.url + "-copy"
                    clone.name = Q.name + "-copy"
                    let qry = `/ds/fhir/Questionnaire/${clone.id}`
                    $http.put(qry,clone).then(
                        function (data) {
                            alert("Successfully copied")
                            $scope.loadAllQ()       //in parent controller
                        },
                        function (err) {
                            alert(angular.toJson(err))
                        }
                    )
                }
            }


            $scope.deleteQ = function(Q) {
                if (confirm("Are you sure you want to delete this Q: " + Q.name)) {
                    let qry = `/ds/fhir/Questionnaire/${Q.id}`
                    $http.delete(qry).then(
                        function(data) {
                            alert("deleted")
                            $scope.loadAllQ()       //in parent controller
                            delete $scope.qmSelectedQ

                            if ($scope.allQ.length > 0) {
                                $scope.selectQ($scope.allQ[0])    //in parent
                            }

                            //delete $scope.selectedQ     //in parent
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }
            }


        })