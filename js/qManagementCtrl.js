angular.module("formsApp")
    .controller('qManagementCtrl',
        function ($scope,$http) {

            $scope.qmSelectQ = function(Q) {
                $scope.qmSelectedQ = Q
            }


            //create a list of all Q

            loadAllQ = function() {
                let url = "/ds/fhir/Questionnaire?_elements=url,title,name,description"

                $http.get(url).then(
                    function (data) {
                        $scope.allQ = [];
                        data.data.entry.forEach(function (entry) {
                            $scope.allQ.push(entry.resource)

                        })
                    }
                )
            }
            loadAllQ()

                            //if run on local machine, will create a copy with the same url & other metadata
            //todo - k=just makes a copy!
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
                            alert("Questionnaire has been deleted")
                            loadAllQ()

                            //delete $scope.selectedQ     //in parent
                        }, function(err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }
            }


        })